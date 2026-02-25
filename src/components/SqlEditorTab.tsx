import React, { useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { Loader2, Terminal, CheckCircle2, XCircle } from 'lucide-react';

interface SqlEditorTabProps {
  tenantId?: string;
}

const SqlEditorTab: React.FC<SqlEditorTabProps> = ({ tenantId }) => {
  const [query, setQuery] = useState<string>('');
  const [results, setResults] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const executeQuery = async () => {
    setError(null);
    setResults(null);
    setIsLoading(true);

    if (!query.trim()) {
      setError('A consulta SQL não pode estar vazia.');
      setIsLoading(false);
      return;
    }

    try {
      // ATENÇÃO: Executar SQL arbitrário diretamente do cliente é um RISCO DE SEGURANÇA.
      // O Supabase-JS não oferece um método direto para SQL arbitrário por design.
      // Para DDL/DML ou consultas complexas, um endpoint de backend com service_role key seria necessário.
      // Esta implementação é para fins de demonstração e pode ser limitada a SELECTs simples
      // ou chamadas RPC (Stored Procedures) pré-definidas.

      // Exemplo de como você PODE interagir com o banco de dados de forma segura (SELECT):
      // Se a query for um SELECT simples, podemos tentar parsear e usar from().select()
      // No entanto, para um editor SQL genérico, isso é inviável no cliente.

      // Para fins de demonstração, vamos simular uma chamada RPC ou uma operação de tabela.
      // Você precisaria de uma função RPC no Supabase que execute o SQL.
      // Ex: CREATE FUNCTION execute_sql(sql_query TEXT) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
      //    BEGIN RETURN query_to_json(sql_query); END; $$;

      // Exemplo de chamada RPC (assumindo que você tem uma função 'execute_sql' no Supabase)
      // const { data, error: rpcError } = await supabase.rpc('execute_sql', { sql_query: query });

      // Exemplo de SELECT simples (apenas para tabelas existentes e com RLS configurado)
      // Para um editor SQL, isso é muito limitado.
      // const tableNameMatch = query.match(/FROM\s+(\w+)/i);
      // if (tableNameMatch && query.trim().toLowerCase().startsWith('select')) {
      //   const tableName = tableNameMatch[1];
      //   const { data, error: selectError } = await supabase.from(tableName).select('*');
      //   if (selectError) throw selectError;
      //   setResults(data);
      // } else {
      //   setError('Apenas consultas SELECT simples ou chamadas RPC são suportadas diretamente no cliente.');
      // }

      // Para um editor SQL funcional no cliente, a melhor abordagem é usar uma função RPC
      // que execute o SQL no backend do Supabase (com RLS apropriado para o super admin).
      // Vou usar um placeholder para isso e você precisaria implementar a função RPC no Supabase.

      // Placeholder para execução de query via RPC
      // Assumindo que existe uma função RPC 'execute_arbitrary_sql' que recebe a query e retorna JSON
      const { data, error: rpcError } = await supabase.rpc('execute_arbitrary_sql', { sql_query: query });

      if (rpcError) throw rpcError;

      setResults(data);

    } catch (e: any) {
      console.error('Erro ao executar consulta SQL:', e.message);
      setError(`Erro: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-2xl shadow-lg flex flex-col h-full">
      <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-3">
        <Terminal size={28} className="text-blue-600" /> Editor SQL
      </h2>
      <p className="text-sm text-slate-600 mb-6">
        Execute consultas SQL diretamente no banco de dados Supabase. Esta funcionalidade é para usuários Super Admin.
        <br />
        <strong className="text-red-500">Atenção:</strong> Para executar SQL arbitrário (DDL/DML), você precisará criar uma função RPC (Stored Procedure) no Supabase (ex: `execute_arbitrary_sql`) que receba a query e a execute com privilégios de `service_role`. O cliente Supabase-JS não permite SQL arbitrário diretamente por razões de segurança.
      </p>

      <textarea
        className="w-full flex-1 p-4 mb-4 font-mono text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 resize-none"
        placeholder="Digite sua consulta SQL aqui (ex: SELECT * FROM tenants;)"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      ></textarea>

      <button
        onClick={executeQuery}
        disabled={isLoading}
        className="bg-blue-600 text-white py-3 px-6 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors disabled:opacity-50"
      >
        {isLoading ? (
          <Loader2 className="animate-spin" size={20} />
        ) : (
          <CheckCircle2 size={20} />
        )}
        {isLoading ? 'Executando...' : 'Executar Consulta'}
      </button>

      {error && (
        <div className="mt-6 p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl flex items-center gap-3">
          <XCircle size={20} className="shrink-0" />
          <pre className="font-mono text-xs whitespace-pre-wrap">{error}</pre>
        </div>
      )}

      {results && results.length > 0 && (
        <div className="mt-6 p-4 bg-green-50 text-green-700 border border-green-200 rounded-xl">
          <h3 className="font-bold text-sm mb-2 flex items-center gap-2"><CheckCircle2 size={16} /> Resultados:</h3>
          <pre className="font-mono text-xs whitespace-pre-wrap overflow-auto max-h-60">{JSON.stringify(results, null, 2)}</pre>
        </div>
      )}

      {results && results.length === 0 && !error && !isLoading && (
        <div className="mt-6 p-4 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-xl flex items-center gap-3">
          <Terminal size={20} className="shrink-0" />
          <p className="font-mono text-xs">Consulta executada, mas nenhum resultado foi retornado.</p>
        </div>
      )}
    </div>
  );
};

export default SqlEditorTab;
