import { db } from './localDb';
import { User } from '../types';

export interface OfflineAuthRecord {
  username: string;
  passwordHash: string;
  salt: string;
  role: 'admin' | 'colaborador' | 'super';
  tenantId: string;
  tenantData: any;
  user: User;
  session: any;
  lastLogin: number;
}

// Utilitário para gerar hash criptográfico SHA-256 no navegador usando Web Crypto API nativa com fallback
export async function hashOfflinePassword(password: string, salt: string): Promise<string> {
  const str = `${password}:${salt}`;
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(str);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
      console.warn('[OfflineAuth] Falha no crypto.subtle, usando fallback:', e);
    }
  }
  // Fallback seguro em caso de ambiente sem Web Crypto (HTTP simples ou webview legado)
  let h1 = 0xdeadbeef ^ 0;
  let h2 = 0x41c6ce57 ^ 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 'offline_hash_' + (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
}

export class OfflineAuth {
  // Salva ou atualiza as credenciais seguras para permitir login futuro sem internet neste aparelho
  static async saveOfflineAuth(
    username: string,
    passwordPlain: string,
    role: 'admin' | 'colaborador' | 'super',
    tenantId: string,
    tenantData: any,
    user: User,
    session: any
  ): Promise<void> {
    if (!username || !passwordPlain) return;
    try {
      const cleanUser = username.trim().toLowerCase();
      const salt = Math.random().toString(36).substring(2, 10);
      const passwordHash = await hashOfflinePassword(passwordPlain.trim(), salt);

      const record: OfflineAuthRecord = {
        username: cleanUser,
        passwordHash,
        salt,
        role,
        tenantId,
        tenantData,
        user,
        session,
        lastLogin: Date.now()
      };

      // 1. Salva no IndexedDB
      try {
        await db.authCache.put(record);
      } catch (dbErr) {
        console.warn('[OfflineAuth] Falha ao gravar em db.authCache, usando redundância:', dbErr);
      }

      // 2. Salva redundância rápida no localStorage
      try {
        localStorage.setItem(`offline_auth_${cleanUser}`, JSON.stringify(record));
        // Se for admin, guarda também a chave de admin para confirmação de exclusões offline
        if (role === 'admin' && tenantId) {
          localStorage.setItem(`admin_auth_${tenantId}`, JSON.stringify({
            passwordHash,
            salt,
            tenantId,
            updatedAt: Date.now()
          }));
        }
      } catch (lsErr) {
        console.warn('[OfflineAuth] Falha no localStorage redundante:', lsErr);
      }
    } catch (e) {
      console.warn('[OfflineAuth] Erro ao cachear credenciais para login offline:', e);
    }
  }

  // Verifica login quando o dispositivo estiver sem internet
  static async verifyOfflineLogin(
    username: string,
    passwordPlain: string
  ): Promise<{
    success: boolean;
    message?: string;
    type?: 'admin' | 'colaborador' | 'super';
    tenant?: any;
    user?: User;
    session?: any;
    isOfflineAuth?: boolean;
  }> {
    const cleanUser = username.trim().toLowerCase();
    if (!cleanUser || !passwordPlain) {
      return { success: false, message: 'Informe usuário e senha.' };
    }

    try {
      // 1. Busca no IndexedDB
      let record: OfflineAuthRecord | undefined;
      try {
        record = await db.authCache.get(cleanUser);
      } catch (e) {}

      // 2. Se não encontrou no IndexedDB, busca no localStorage de redundância
      if (!record) {
        try {
          const raw = localStorage.getItem(`offline_auth_${cleanUser}`);
          if (raw) record = JSON.parse(raw);
        } catch (e) {}
      }

      if (!record) {
        // Fallback inteligente: verifica se o usuário já existe na tabela local db.users ou db.settings
        try {
          const localUsers = await db.users.toArray();
          const matchedUser = localUsers.find(
            (u: any) => u.username && u.username.trim().toLowerCase() === cleanUser
          );
          if (matchedUser && matchedUser.password === passwordPlain.trim()) {
            const tenantId = matchedUser.tenantId || '';
            const settings = tenantId ? await db.settings.get(tenantId) : null;
            const userObj: User = {
              id: matchedUser.id ? String(matchedUser.id) : tenantId || 'temp',
              name: matchedUser.name || matchedUser.username,
              role: (matchedUser.role as any) || 'admin',
              photo: matchedUser.photo || null
            };
            const sessionObj = {
              isLoggedIn: true,
              type: (matchedUser.role as any) || 'admin',
              tenantId: tenantId,
              isSuper: (matchedUser.role as any) === 'super',
              subscriptionStatus: 'active',
              printerSize: 58
            };
            await this.saveOfflineAuth(
              cleanUser,
              passwordPlain.trim(),
              (matchedUser.role as any) || 'admin',
              tenantId,
              settings,
              userObj,
              sessionObj
            );
            return {
              success: true,
              type: (matchedUser.role as any) || 'admin',
              tenant: settings,
              user: userObj,
              session: sessionObj,
              isOfflineAuth: true
            };
          }
        } catch (localUserErr) {
          console.warn('[OfflineAuth] Falha ao verificar db.users:', localUserErr);
        }

        return {
          success: false,
          message: 'Sem internet: este usuário ainda não foi autenticado neste dispositivo. Conecte-se à internet uma vez para habilitar o login offline.'
        };
      }

      // Calcula o hash da senha digitada com o salt armazenado
      const testHash = await hashOfflinePassword(passwordPlain.trim(), record.salt);
      if (testHash !== record.passwordHash) {
        return {
          success: false,
          message: 'Senha incorreta para acesso offline.'
        };
      }

      return {
        success: true,
        type: record.role,
        tenant: record.tenantData,
        user: record.user,
        session: record.session,
        isOfflineAuth: true
      };
    } catch (err: any) {
      console.error('[OfflineAuth] Erro ao validar login offline:', err);
      return {
        success: false,
        message: 'Erro interno ao validar credenciais offline.'
      };
    }
  }

  // Validação offline da senha de administrador (usada em exclusões de OS, cancelamento de vendas e logout)
  static async verifyOfflineAdminPassword(
    tenantId: string,
    passwordPlain: string
  ): Promise<{ success: boolean; message?: string }> {
    if (!passwordPlain) return { success: false, message: 'Senha não informada.' };

    try {
      // 1. Tenta buscar registro de admin para este tenant no localStorage
      let adminRecord: any = null;
      try {
        const raw = localStorage.getItem(`admin_auth_${tenantId}`);
        if (raw) adminRecord = JSON.parse(raw);
      } catch (e) {}

      if (adminRecord && adminRecord.salt && adminRecord.passwordHash) {
        const hash = await hashOfflinePassword(passwordPlain.trim(), adminRecord.salt);
        if (hash === adminRecord.passwordHash) {
          return { success: true };
        }
      }

      // 2. Busca qualquer usuário com role 'admin' ou 'super' para este tenant no IndexedDB
      try {
        const authRecords = await db.authCache
          .where('tenantId')
          .equals(tenantId)
          .filter(r => r.role === 'admin' || r.role === 'super')
          .toArray();

        for (const rec of authRecords) {
          const hash = await hashOfflinePassword(passwordPlain.trim(), rec.salt);
          if (hash === rec.passwordHash) {
            return { success: true };
          }
        }
      } catch (e) {}

      // 3. Fallback: verifica se a senha confere com o usuário atualmente logado (se for admin)
      try {
        const storedUser = localStorage.getItem('currentUser_pro');
        const storedSession = localStorage.getItem('session_pro');
        if (storedSession && storedUser) {
          const sess = JSON.parse(storedSession);
          if (sess.tenantId === tenantId && (sess.type === 'admin' || sess.isSuper)) {
            const userObj = JSON.parse(storedUser);
            if (userObj.username) {
              const check = await this.verifyOfflineLogin(userObj.username, passwordPlain);
              if (check.success) return { success: true };
            }
          }
        }
      } catch (e) {}

      return {
        success: false,
        message: 'Senha de administrador incorreta no modo offline.'
      };
    } catch (e) {
      console.error('[OfflineAuth] Erro ao validar senha de admin offline:', e);
      return { success: false, message: 'Erro ao validar autorização offline.' };
    }
  }

  // Retorna lista de usuários que já têm login habilitado offline neste dispositivo
  static async getAvailableOfflineUsers(): Promise<Array<{ username: string; name: string; role: string }>> {
    try {
      const usersMap = new Map<string, { username: string; name: string; role: string }>();

      // 1. IndexedDB
      try {
        const records = await db.authCache.toArray();
        for (const r of records) {
          if (r.username) {
            usersMap.set(r.username, {
              username: r.username,
              name: r.user?.name || r.username,
              role: r.role
            });
          }
        }
      } catch (e) {}

      // 2. Redundância em localStorage
      try {
        if (typeof localStorage !== 'undefined') {
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('offline_auth_')) {
              const raw = localStorage.getItem(key);
              if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && parsed.username && !usersMap.has(parsed.username)) {
                  usersMap.set(parsed.username, {
                    username: parsed.username,
                    name: parsed.user?.name || parsed.username,
                    role: parsed.role
                  });
                }
              }
            }
          }
        }
      } catch (e) {}

      return Array.from(usersMap.values());
    } catch {
      return [];
    }
  }
}
