// Motor de Inteligência Fiscal: NCM, CEST e CFOP
// Suporte a importação de planilhas (XLSX, CSV, JSON, TXT),
// sincronização no Supabase e pareamento inteligente por nome de produto.

import * as XLSX from 'xlsx';
import { db } from './localDb';
import { supabase } from './api';
import { FiscalNcmRecord, FiscalCestRecord, FiscalCfopRecord, FiscalMatchResult, Product } from '../types';

// ============================================================================
// 1. BASE OFICIAL BRASILEIRA PRÉ-EMBUTIDA (TAXONOMIA MASTER DE VAREJO / ERP)
// ============================================================================

export const DEFAULT_NCM_LIST: FiscalNcmRecord[] = [
  // --- RELÓGIOS, JOIAS, ÓTICA E ACESSÓRIOS PESSOAIS ---
  { code: '9102.11.10', description: 'Relógios de pulso de quartzo com mostrador analógico e caixa de metal (Relógio Masculino / Relógio Feminino / Relógio Analógico / Relógio Dourado / Prata)', cfop: '5102', category: 'Relojoaria e Acessórios' },
  { code: '9102.12.20', description: 'Relógios de pulso eletrônicos com mostrador exclusivamente digital (Relógio Digital / Casio / G-Shock / Relógio Esportivo)', cfop: '5102', category: 'Relojoaria e Acessórios' },
  { code: '8517.62.77', description: 'Smartwatches, relógios inteligentes e pulseiras conectadas Bluetooth (Smartwatch / Apple Watch / Galaxy Watch / Smartband / Relógio Inteligente)', cfop: '5102', category: 'Relojoaria e Eletrônicos' },
  { code: '9102.21.00', description: 'Relógios de pulso de corda automática mecânicos', cfop: '5102', category: 'Relojoaria e Acessórios' },
  { code: '9105.21.00', description: 'Relógios de parede elétricos ou a pilha e despertadores de mesa', cfop: '5102', category: 'Relojoaria e Decoração' },
  { code: '9004.10.00', description: 'Óculos de sol, óculos solares e óculos escuros (Ray-Ban / Óculos de Proteção Solar)', cfop: '5102', category: 'Ótica e Acessórios' },
  { code: '9003.11.00', description: 'Armações para óculos de grau em plástico / acetato', cfop: '5102', category: 'Ótica e Acessórios' },
  { code: '9003.19.10', description: 'Armações para óculos de grau em metal ou titânio', cfop: '5102', category: 'Ótica e Acessórios' },
  { code: '9001.50.00', description: 'Lentes para óculos de outras matérias (Lentes de grau / Lentes de contato)', cfop: '5102', category: 'Ótica e Acessórios' },
  { code: '7117.19.00', description: 'Bijuterias e semijoias de metais comuns (Brincos, Colares, Pulseiras, Anéis, Correntes, Pingentes folheados)', cfop: '5102', category: 'Joias e Bijuterias' },
  { code: '7113.19.00', description: 'Artigos de joalharia e suas partes de metais preciosos (Joias de Ouro 18k e Prata 925)', cfop: '5102', category: 'Joias e Bijuterias' },

  // --- BOLSAS, MALAS, CARTEIRAS, MOCHILAS E ARTIGOS DE COURO ---
  { code: '4202.22.10', description: 'Bolsas femininas com a superfície exterior de plástico ou matérias têxteis (Bolsa Feminina / Bolsa Transversal / Bolsa de Ombro / Clutch)', cfop: '5102', category: 'Bolsas e Acessórios' },
  { code: '4202.21.00', description: 'Bolsas femininas com a superfície exterior de couro natural ou reconstituído', cfop: '5102', category: 'Bolsas e Acessórios' },
  { code: '4202.12.10', description: 'Mochilas escolares, mochilas para notebook, malas de viagem e maletas de viagem', cfop: '5102', category: 'Bolsas e Malas' },
  { code: '4202.31.00', description: 'Carteiras de bolso, porta-cartões e porta-moedas de couro ou couro sintético (Carteira Masculina / Feminina)', cfop: '5102', category: 'Bolsas e Acessórios' },
  { code: '4203.30.00', description: 'Cintos, cinturões e bandoleiras de couro natural ou reconstituído (Cinto Masculino / Feminino)', cfop: '5102', category: 'Acessórios e Couro' },

  // --- CELULARES, INFORMÁTICA E PEÇAS DE ASSISTÊNCIA TÉCNICA ---
  { code: '8517.13.00', description: 'Smartphones e aparelhos telefônicos celulares inteligentes (iPhone, Samsung Galaxy, Motorola, Xiaomi, Aparelho Celular)', cfop: '5102', category: 'Telefonia' },
  { code: '3926.90.90', description: 'Capas, capinhas protetoras para celular e tablet em silicone, TPU ou plástico antichoque (Case de celular / Case iPhone / Case Samsung / Capa protetora)', cfop: '5102', category: 'Acessórios e Telefonia' },
  { code: '4202.32.00', description: 'Capas, estojos e carteiras para celular com superfície exterior de couro natural ou sintético (Case de couro para celular)', cfop: '5102', category: 'Acessórios e Telefonia' },
  { code: '7007.19.00', description: 'Películas protetoras de tela em vidro temperado, película 3D, 9D, cerâmica e hidrogel para celular e tablet', cfop: '5102', category: 'Acessórios e Telefonia' },
  { code: '8504.40.10', description: 'Carregadores de bateria de celular e smartphone, fontes de alimentação AC/DC, carregador turbo e carregador veicular', cfop: '5102', category: 'Acessórios e Telefonia' },
  { code: '8544.42.00', description: 'Cabos USB, cabos Lightning, Tipo-C (Type-C) e cabos de dados para celular com conectores', cfop: '5102', category: 'Acessórios e Telefonia' },
  { code: '8507.60.00', description: 'Baterias de íons de lítio recarregáveis para celular e notebook, bateria portátil, Power Bank e capas com bateria recarregável incorporada (Capa com Bateria / Capa Carregadora / Smart Battery Case / Case com Bateria)', cfop: '5102', category: 'Acessórios e Peças' },
  { code: '8517.79.00', description: 'Telas, displays OLED/LCD, módulos frontais, vidros touch screen e peças de reposição para smartphones', cfop: '5102', category: 'Peças e Assistência Técnica' },
  { code: '8518.30.00', description: 'Fones de ouvido com ou sem microfone, fones Bluetooth / AirPods / Headsets', cfop: '5102', category: 'Áudio e Acessórios' },
  { code: '8518.22.00', description: 'Caixas de som acústicas com múltiplos alto-falantes montados no mesmo receptáculo (Caixa de Som Bluetooth / Soundbar / Caixa Amplificada / JBL)', cfop: '5102', cest: '21.057.00', category: 'Áudio e Som' },
  { code: '8518.21.00', description: 'Caixas de som acústicas com alto-falante único montado no seu receptáculo (Caixa de Som Portátil / Caixinha de Som / Alto-falante)', cfop: '5102', cest: '21.056.00', category: 'Áudio e Som' },
  { code: '8518.29.00', description: 'Outras caixas de som acústicas e alto-falantes (Torre de Som / Caixa de Som Ativa / Subwoofers)', cfop: '5102', cest: '21.058.00', category: 'Áudio e Som' },
  { code: '8518.40.00', description: 'Amplificadores elétricos de áudio e som (Módulos de som / Potências)', cfop: '5102', category: 'Áudio e Som' },
  { code: '8518.10.00', description: 'Microfones e seus suportes', cfop: '5102', category: 'Áudio e Som' },
  { code: '8527.13.00', description: 'Aparelhos receptores de radiodifusão combinados com reprodutor de som (Mini System / Rádio Portátil / Boombox)', cfop: '5102', category: 'Áudio e Som' },
  { code: '8504.40.21', description: 'Fontes de alimentação chaveadas e carregadores para computadores portáteis (Fonte / Carregador de Notebook / Dell, Lenovo, Acer, HP, Apple MagSafe)', cfop: '5102', category: 'Informática e Peças' },
  { code: '8471.30.12', description: 'Computadores portáteis (Notebooks, Laptops, MacBooks e Ultrabooks)', cfop: '5102', category: 'Informática' },
  { code: '8471.41.00', description: 'Computadores pessoais de mesa completos (PC Desktop / PC Gamer / CPU)', cfop: '5102', category: 'Informática' },
  { code: '8471.30.11', description: 'Tablets portáteis com tela sensível ao toque (iPad / Galaxy Tab / Tablet Android)', cfop: '5102', category: 'Informática' },
  { code: '8471.60.52', description: 'Teclados para computador USB, gamer ou sem fio', cfop: '5102', category: 'Informática' },
  { code: '8471.60.53', description: 'Mouses ópticos, gamers ou laser para computador e notebook', cfop: '5102', category: 'Informática' },
  { code: '8528.52.00', description: 'Monitores de vídeo para computador (Monitor Gamer / LED / IPS)', cfop: '5102', category: 'Informática' },
  { code: '8471.70.12', description: 'Unidades de disco rígido e unidades de estado sólido (SSD / SSD NVMe / HD externo)', cfop: '5102', category: 'Informática' },
  { code: '8523.51.10', description: 'Cartões de memória MicroSD e Pen Drives USB', cfop: '5102', category: 'Informática' },
  { code: '8443.32.22', description: 'Impressoras de cupom fiscal térmicas não de impacto e impressoras multifuncionais', cfop: '5102', category: 'Automação' },
  { code: '8528.72.00', description: 'Aparelhos receptores de televisão em cores (Smart TV LED / OLED / 4K / TV 50 / TV 55 / TV 65)', cfop: '5102', category: 'Eletrônicos' },
  { code: '9504.50.00', description: 'Consoles e aparelhos de videogame (PlayStation 5, Xbox Series, Nintendo Switch, Controles e Joysticks)', cfop: '5102', category: 'Games e Eletrônicos' },
  { code: '8525.89.29', description: 'Câmeras fotográficas digitais, câmeras de segurança CFTV e drones com câmera', cfop: '5102', category: 'Eletrônicos' },

  // --- ELETRODOMÉSTICOS E PORTÁTEIS ---
  { code: '8418.10.00', description: 'Combinados refrigeradores-congeladores (Geladeiras Frost Free, Refrigeradores Duplex, Freezers)', cfop: '5405', cest: '21.001.00', category: 'Eletrodomésticos' },
  { code: '8450.11.00', description: 'Máquinas de lavar roupa automáticas e lava-e-seca (Lava e Seca / Tanquinho)', cfop: '5405', cest: '21.004.00', category: 'Eletrodomésticos' },
  { code: '8415.10.11', description: 'Aparelhos de ar-condicionado do tipo Split System / Inverter', cfop: '5405', cest: '21.011.00', category: 'Climatização' },
  { code: '8414.51.10', description: 'Ventiladores de mesa, parede, teto ou de coluna (Ventilador Mondial, Arno)', cfop: '5405', cest: '21.017.00', category: 'Eletrodomésticos' },
  { code: '8516.50.00', description: 'Fornos de micro-ondas para uso doméstico', cfop: '5405', cest: '21.020.00', category: 'Eletrodomésticos' },
  { code: '8516.60.00', description: 'Fornos elétricos, fogões de indução, fritadeiras elétricas sem óleo (Airfryer / Fritadeira Elétrica)', cfop: '5405', cest: '21.021.00', category: 'Eletrodomésticos' },
  { code: '8516.71.00', description: 'Aparelhos elétricos para preparação de café ou chá (Cafeteira Elétrica / Nespresso / Dolce Gusto)', cfop: '5102', category: 'Eletrodomésticos' },
  { code: '8509.40.10', description: 'Liquidificadores, batedeiras e trituradores de alimentos', cfop: '5405', cest: '21.028.00', category: 'Eletrodomésticos' },
  { code: '8516.40.00', description: 'Ferros elétricos de passar roupa a vapor ou a seco', cfop: '5405', cest: '21.025.00', category: 'Eletrodomésticos' },
  { code: '8516.31.00', description: 'Secadores de cabelo, pranchas alisadoras, chapinhas e modeladores de cachos', cfop: '5405', cest: '21.031.00', category: 'Eletrodomésticos' },
  { code: '8508.11.00', description: 'Aspiradores de pó elétricos (Aspirador Vertical / Aspirador Robô)', cfop: '5405', cest: '21.033.00', category: 'Eletrodomésticos' },
  { code: '8516.10.10', description: 'Chuveiros elétricos, duchas elétricas e aquecedores de água instantâneos', cfop: '5405', cest: '21.024.00', category: 'Eletrodomésticos' },

  // --- ALIMENTAÇÃO, GRÃOS E MERCADO (SUPERMERCADOS, AÇOUGUE, PADARIA, HORTIFRÚTI) ---
  { code: '1006.30.21', description: 'Arroz semibranqueado ou branqueado, polido ou brunido (Arroz Branco / Parboilizado / Tio João / Camil)', cfop: '5102', category: 'Alimentos' },
  { code: '1006.10.92', description: 'Arroz com casca (arroz em palha), não parboilizado', cfop: '5102', category: 'Alimentos' },
  { code: '1006.20.20', description: 'Arroz descascado (arroz cargo ou castanho) parboilizado e arroz integral', cfop: '5102', category: 'Alimentos' },
  { code: '1006.40.00', description: 'Arroz quebrado (quirera de arroz)', cfop: '5102', category: 'Alimentos' },
  { code: '0713.33.90', description: 'Feijão preto, carioca, fradinho ou comum (Legumes de vagem secos)', cfop: '5102', category: 'Alimentos' },
  { code: '0901.21.00', description: 'Café torrado, não descafeinado (Café em pó / Café moído / Café em grãos / Cápsulas de café)', cfop: '5102', category: 'Alimentos' },
  { code: '2101.11.10', description: 'Café solúvel instantâneo (Nescafé)', cfop: '5102', category: 'Alimentos' },
  { code: '1701.14.00', description: 'Açúcar de cana refinado, cristal, mascavo ou demerara (Açúcar União)', cfop: '5102', category: 'Alimentos' },
  { code: '1507.90.11', description: 'Óleo de soja refinado em recipientes de até 5 litros (Óleo Liza, Soya)', cfop: '5102', category: 'Alimentos' },
  { code: '1509.20.00', description: 'Azeite de oliva extra virgem e virgem em garrafas (Azeite Gallo, Andorinha)', cfop: '5102', category: 'Alimentos' },
  { code: '1101.00.10', description: 'Farinha de trigo de uso doméstico comum e com fermento (Dona Benta)', cfop: '5102', category: 'Alimentos' },
  { code: '1106.20.00', description: 'Farinha de mandioca e polvilho doce / azedo', cfop: '5102', category: 'Alimentos' },
  { code: '1102.20.00', description: 'Fubá de milho e farinha de milho (Flocão de milho / Cuscuz)', cfop: '5102', category: 'Alimentos' },
  { code: '1902.19.00', description: 'Massas alimentícias secas (Macarrão Espaguete, Penne, Parafuso / Barilla, Adria)', cfop: '5102', category: 'Alimentos' },
  { code: '1902.30.00', description: 'Macarrão instantâneo (Miojo / Cup Noodles)', cfop: '5102', category: 'Alimentos' },
  { code: '1905.31.00', description: 'Biscoitos e bolachas doces, recheadas e rosquinhas (Oreo, Passatempo)', cfop: '5102', category: 'Alimentos' },
  { code: '1905.90.20', description: 'Biscoitos salgados, cream cracker e água e sal (Bauducco, Club Social)', cfop: '5102', category: 'Alimentos' },
  { code: '1905.90.90', description: 'Pães franceses, pão de forma, torradas, bolos prontos e panificação (Pullman, Wickbold)', cfop: '5102', category: 'Alimentos' },
  { code: '0401.20.10', description: 'Leite UHT integral longa vida, semidesnatado ou desnatado (Italac, Piracanjuba, Ninho)', cfop: '5102', category: 'Laticínios' },
  { code: '0402.21.10', description: 'Leite em pó integral ou desnatado em latas ou pacotes', cfop: '5102', category: 'Laticínios' },
  { code: '0402.99.00', description: 'Leite condensado e doces de leite (Leite Moça, Piracanjuba)', cfop: '5102', category: 'Laticínios' },
  { code: '0401.50.10', description: 'Creme de leite esterilizado ou pasteurizado UHT', cfop: '5102', category: 'Laticínios' },
  { code: '0405.10.00', description: 'Manteiga de leite com ou sem sal (Aviação, Elegê)', cfop: '5102', category: 'Laticínios' },
  { code: '1517.10.00', description: 'Margarina vegetal com ou sem sal (Qualy, Doriana, Delícia)', cfop: '5102', category: 'Alimentos' },
  { code: '0406.10.10', description: 'Queijo mussarela, prato, minas frescal, queijo coalho e ricota', cfop: '5102', category: 'Laticínios' },
  { code: '0406.90.20', description: 'Queijo parmesão ralado em saquinhos', cfop: '5102', category: 'Laticínios' },
  { code: '0403.20.00', description: 'Iogurtes, leites fermentados e bebidas lácteas (Danone, Yakult, Activia)', cfop: '5102', category: 'Laticínios' },
  { code: '0201.30.00', description: 'Carne bovina desossada fresca ou refrigerada (Picanha, Alcatra, Contrafilé, Patinho, Carne Moída)', cfop: '5102', category: 'Carnes' },
  { code: '0202.30.00', description: 'Carne bovina congelada desossada', cfop: '5102', category: 'Carnes' },
  { code: '0207.14.00', description: 'Carne de frango em pedaços e miudezas congelados (Peito de frango, Coxa, Sobrecoxa, Filé de frango / Sadia, Perdigão)', cfop: '5102', category: 'Carnes' },
  { code: '0203.29.00', description: 'Carne suína fresca ou congelada (Bisteca, Costelinha, Lombo de porco, Pernil)', cfop: '5102', category: 'Carnes' },
  { code: '0303.89.00', description: 'Peixes congelados inteiros ou em filés (Tilápia, Salmão, Merluza, Bacalhau)', cfop: '5102', category: 'Pescados' },
  { code: '1601.00.00', description: 'Enchidos e linguiças, salsichas e embutidos (Linguiça Toscana, Calabresa, Salsicha Hot Dog)', cfop: '5405', cest: '17.001.00', category: 'Carnes' },
  { code: '1602.41.00', description: 'Presunto cozido, apresuntado e mortadela fatiados', cfop: '5405', cest: '17.003.00', category: 'Frios' },
  { code: '1806.31.10', description: 'Chocolate em barras, tabletes, caixas de bombons recheados (Nestlé, Garoto, Lacta)', cfop: '5102', category: 'Doces' },
  { code: '2103.20.10', description: 'Molho de tomate e extrato de tomate em sachê ou lata (Elefante, Pomarola)', cfop: '5102', category: 'Alimentos' },
  { code: '2103.90.21', description: 'Maionese em potes ou sachês (Hellmanns, Heinz)', cfop: '5102', category: 'Alimentos' },
  { code: '2103.30.21', description: 'Mostarda e Ketchup preparados', cfop: '5102', category: 'Alimentos' },
  { code: '2501.00.20', description: 'Sal de cozinha refinado iodado e sal grosso para churrasco (Sal Cisne)', cfop: '5102', category: 'Alimentos' },
  { code: '0803.90.00', description: 'Bananas frescas (Banana Prata, Nanica, Maçã)', cfop: '5102', category: 'Hortifrúti' },
  { code: '0808.10.00', description: 'Maçãs frescas (Maçã Gala, Fuji)', cfop: '5102', category: 'Hortifrúti' },
  { code: '0805.10.00', description: 'Laranjas frescas (Laranja Pêra, Lima, Bahia) e limões', cfop: '5102', category: 'Hortifrúti' },
  { code: '0702.00.00', description: 'Tomates frescos ou refrigerados', cfop: '5102', category: 'Hortifrúti' },
  { code: '0703.10.19', description: 'Cebolas frescas e alho em réstias', cfop: '5102', category: 'Hortifrúti' },
  { code: '0701.90.00', description: 'Batatas frescas ou refrigeradas (Batata Inglesa, Batata Doce)', cfop: '5102', category: 'Hortifrúti' },

  // --- BEBIDAS (Geralmente sujeitas a Substituição Tributária / CEST) ---
  { code: '2202.10.00', description: 'Águas com gás, refrigerantes aromatizados ou adicionados de açúcar (Coca-Cola, Guaraná Antarctica, Fanta, Pepsi, Sprite, Schweppes)', cfop: '5405', cest: '03.010.00', category: 'Bebidas' },
  { code: '2201.10.00', description: 'Água mineral natural sem gás em garrafas e galões de 20L (Crystal, Indaiá, Minalba, Bonafont)', cfop: '5405', cest: '03.001.00', category: 'Bebidas' },
  { code: '2203.00.00', description: 'Cerveja de malte em lata, garrafa, long neck ou chopp (Heineken, Brahma, Skol, Amstel, Budweiser, Corona, Spaten, Stella Artois)', cfop: '5405', cest: '03.021.00', category: 'Bebidas' },
  { code: '2204.21.00', description: 'Vinho de uvas frescas em recipientes de até 2 litros e espumantes', cfop: '5405', cest: '02.018.00', category: 'Bebidas' },
  { code: '2208.40.00', description: 'Aguardente de cana / Cachaça (51, Pitú, Ypióca, Velho Barreiro)', cfop: '5405', cest: '02.001.00', category: 'Bebidas' },
  { code: '2208.30.20', description: 'Whisky / Uísque em garrafas (Johnnie Walker, Red Label, Jack Daniels, White Horse, Ballantines)', cfop: '5405', cest: '02.007.00', category: 'Bebidas' },
  { code: '2208.60.00', description: 'Vodka / Voje em garrafas (Smirnoff, Absolut, Orloff)', cfop: '5405', cest: '02.008.00', category: 'Bebidas' },
  { code: '2208.50.00', description: 'Gin / Gim em garrafas (Tanqueray, Gordon, Bombay)', cfop: '5405', cest: '02.006.00', category: 'Bebidas' },
  { code: '2009.89.90', description: 'Sucos de frutas naturais, polpas de fruta e néctares em caixinha (Del Valle, Maguary)', cfop: '5102', category: 'Bebidas' },
  { code: '2202.99.00', description: 'Bebidas energéticas e isotônicos (Red Bull, Monster Energy, Gatorade, Powerade)', cfop: '5405', cest: '03.011.00', category: 'Bebidas' },

  // --- FARMÁCIA, MEDICAMENTOS, SUPLEMENTOS E HIGIENE PESSOAL ---
  { code: '3004.90.99', description: 'Medicamentos dosados para venda a retalho (Dipirona, Paracetamol, Ibuprofeno, Amoxicilina, Omeprazol, Dorflex, Neosaldina, Losartana)', cfop: '5405', cest: '13.001.00', category: 'Farmácia' },
  { code: '3004.90.69', description: 'Vitaminas, polivitamínicos e suplementos alimentares (Vitamina C, Ômega 3, Creatina, Whey Protein)', cfop: '5102', category: 'Suplementos' },
  { code: '3005.10.60', description: 'Curativos adesivos, esparadrapos, fitas micropore e gazes hospitalares (Band-Aid)', cfop: '5102', category: 'Farmácia' },
  { code: '9619.00.00', description: 'Fraldas descartáveis infantis e geriátricas e absorventes higiênicos femininos (Pampers, Huggies, Always)', cfop: '5405', cest: '20.049.00', category: 'Higiene' },
  { code: '3401.11.90', description: 'Sabonetes de toucador em barra e sabonetes antibacterianos (Dove, Lux, Protex, Nivea)', cfop: '5405', cest: '20.034.00', category: 'Higiene' },
  { code: '3401.20.90', description: 'Sabonetes líquidos corporais e faciais em refil ou pump', cfop: '5405', cest: '20.035.00', category: 'Higiene' },
  { code: '3305.10.00', description: 'Xampus / Shampoos para o cabelo (Head & Shoulders, Pantene, Seda, Clear, Loreal)', cfop: '5405', cest: '20.017.00', category: 'Cosméticos' },
  { code: '3305.90.00', description: 'Condicionadores, cremes de pentear e máscaras capilares', cfop: '5405', cest: '20.020.00', category: 'Cosméticos' },
  { code: '3306.10.00', description: 'Dentifrícios / Creme dental e pasta de dente (Colgate, Sorriso, Oral-B, Sensodyne)', cfop: '5405', cest: '20.023.00', category: 'Higiene' },
  { code: '9603.21.00', description: 'Escovas de dentes manuais e elétricas (Oral-B, Colgate)', cfop: '5405', cest: '20.024.00', category: 'Higiene' },
  { code: '3306.20.00', description: 'Fio dental e fitas dentárias para higiene interdental', cfop: '5405', cest: '20.025.00', category: 'Higiene' },
  { code: '3307.20.10', description: 'Desodorantes corporais antitranspirantes em spray, aerossol ou roll-on (Rexona, Nivea, Axe, Dove)', cfop: '5405', cest: '20.026.00', category: 'Higiene' },
  { code: '3303.00.10', description: 'Perfumes e águas-de-colônia (O Boticário, Natura, Carolina Herrera, Paco Rabanne, Malbec)', cfop: '5405', cest: '20.001.00', category: 'Perfumaria' },
  { code: '3304.99.10', description: 'Protetores solares, bloqueadores solares e bronzeadores (Sundown, Episol, La Roche)', cfop: '5405', cest: '20.014.00', category: 'Cosméticos' },
  { code: '3304.10.00', description: 'Produtos de maquiagem para os lábios (Batom, Gloss labial, Lip tint)', cfop: '5405', cest: '20.005.00', category: 'Maquiagem' },
  { code: '3304.20.10', description: 'Máscaras para cílios (Rímel), delineadores e lápis de olho', cfop: '5405', cest: '20.006.00', category: 'Maquiagem' },
  { code: '3304.30.00', description: 'Preparações para manicuros e pedicuros (Esmaltes de unha, bases fortalecedoras / Risqué, Impala, Colorama)', cfop: '5405', cest: '20.007.00', category: 'Cosméticos' },
  { code: '4818.10.00', description: 'Papel higiênico folha simples, dupla ou tripla (Neve, Personal, Paloma)', cfop: '5405', cest: '20.048.00', category: 'Higiene' },
  { code: '4818.20.00', description: 'Lenços de papel, guardanapos, toalhas de papel de cozinha e lenços umedecidos', cfop: '5405', cest: '20.047.00', category: 'Higiene' },

  // --- LIMPEZA E UTILIDADES DOMÉSTICAS ---
  { code: '3402.20.00', description: 'Detergentes líquidos para louça e cozinha (Ypê, Limpol, Minuano)', cfop: '5405', cest: '11.001.00', category: 'Limpeza' },
  { code: '3402.90.39', description: 'Sabão em pó e sabão líquido para lavar roupas (Omo, Brilhante, Tixan Ypê, Ariel)', cfop: '5405', cest: '11.003.00', category: 'Limpeza' },
  { code: '3809.91.90', description: 'Amaciantes de roupas concentrados ou comuns (Comfort, Downy, Ypê)', cfop: '5405', cest: '11.005.00', category: 'Limpeza' },
  { code: '2828.90.11', description: 'Água sanitária, cloro e alvejantes com hipoclorito (Q-Boa, Candura, Dragão)', cfop: '5405', cest: '11.007.00', category: 'Limpeza' },
  { code: '3808.94.19', description: 'Desinfetantes, bactericidas e limpadores multiuso (Pinho Sol, Lysoform, Veja Multiuso)', cfop: '5405', cest: '11.011.00', category: 'Limpeza' },
  { code: '3405.40.00', description: 'Palha de aço, lã de aço e esponjas de limpeza abrasivas (Bombril, Assolan)', cfop: '5405', cest: '11.008.00', category: 'Limpeza' },
  { code: '9603.90.00', description: 'Vassouras de piaçava/nylon, rodos de borracha, pás de lixo e mops giratórios', cfop: '5102', category: 'Limpeza' },
  { code: '3923.21.90', description: 'Sacos plásticos para lixo de 15L, 30L, 50L e 100L (Embalixo)', cfop: '5102', category: 'Limpeza' },
  { code: '7615.10.00', description: 'Panelas de alumínio, conjuntos de panelas e frigideiras antiaderentes (Tramontina, Rochedo)', cfop: '5102', category: 'Utilidades' },
  { code: '8215.99.10', description: 'Faqueiros, talheres, garfos, facas de mesa e colheres de aço inox (Tramontina)', cfop: '5102', category: 'Utilidades' },
  { code: '7013.37.00', description: 'Copos de vidro, taças de vidro e jarras de vidro (Nadir Figueiredo)', cfop: '5102', category: 'Utilidades' },
  { code: '3924.10.00', description: 'Potes plásticos herméticos para alimentos e organizadores de cozinha (Tupperware / Sanremo)', cfop: '5102', category: 'Utilidades' },

  // --- VESTUÁRIO, CALÇADOS E TECIDOS ---
  { code: '6109.10.00', description: 'Camisetas (T-shirts), regatas e blusas de malha de algodão', cfop: '5102', category: 'Vestuário' },
  { code: '6105.10.00', description: 'Camisas polo masculinas e camisas sociais de algodão', cfop: '5102', category: 'Vestuário' },
  { code: '6203.42.00', description: 'Calças jeans, bermudas e shorts jeans masculinos', cfop: '5102', category: 'Vestuário' },
  { code: '6204.62.00', description: 'Calças e bermudas jeans femininas (Calça Jeans Feminina / Shorts)', cfop: '5102', category: 'Vestuário' },
  { code: '6204.42.00', description: 'Vestidos femininos e saias de tecidos de algodão ou sintéticos', cfop: '5102', category: 'Vestuário' },
  { code: '6107.11.00', description: 'Cuecas masculinas boxer ou slip de algodão (Lupo, Zorba, Calvin Klein)', cfop: '5102', category: 'Moda Íntima' },
  { code: '6108.21.00', description: 'Calcinhas femininas e tangas de algodão ou microfibra', cfop: '5102', category: 'Moda Íntima' },
  { code: '6212.10.00', description: 'Sutiãs, tops esportivos e lingeries femininas', cfop: '5102', category: 'Moda Íntima' },
  { code: '6115.95.00', description: 'Meias de algodão esportivas, meias cano curto e meias sociais (Lupo)', cfop: '5102', category: 'Moda Íntima' },
  { code: '6110.20.00', description: 'Moletons com ou sem capuz, blusas de frio e agasalhos de algodão', cfop: '5102', category: 'Vestuário' },
  { code: '6101.20.00', description: 'Casacos, jaquetas de inverno e jaquetas jeans', cfop: '5102', category: 'Vestuário' },
  { code: '6505.00.11', description: 'Bonés, chapéus, viseiras e gorros esportivos', cfop: '5102', category: 'Acessórios' },
  { code: '6404.11.00', description: 'Calçados para esporte, tênis de corrida, caminhada e academia (Nike, Adidas, Olympikus, Mizuno, Puma, Asics)', cfop: '5102', category: 'Calçados' },
  { code: '6403.59.00', description: 'Sapatos sociais masculinos de couro, botas e sapatênis', cfop: '5102', category: 'Calçados' },
  { code: '6402.99.90', description: 'Chinelos de borracha, sandálias de dedo e rasteirinhas (Havaianas, Ipanema, Rider)', cfop: '5102', category: 'Calçados' },

  // --- PAPELARIA, ESCRITÓRIO E MATERIAL ESCOLAR ---
  { code: '4820.10.00', description: 'Cadernos escolares espiral, brochura, 1 matéria, 10 matérias, agendas e blocos de anotações (Tilibra, Jandaia)', cfop: '5102', category: 'Papelaria' },
  { code: '4802.56.10', description: 'Papel sulfite A4 branco pacote com 500 folhas (Chamex, Report, Suzano)', cfop: '5102', category: 'Papelaria' },
  { code: '9608.10.00', description: 'Canetas esferográficas azuis, pretas, vermelhas e canetas gel (BIC, Compactor, Faber-Castell)', cfop: '5102', category: 'Papelaria' },
  { code: '9608.20.00', description: 'Canetas hidrográficas, marca-textos coloridos e canetas para quadro branco (Faber-Castell, Pilot)', cfop: '5102', category: 'Papelaria' },
  { code: '9609.10.00', description: 'Lápis pretos de grafite e caixas de lápis de cor 12/24/36 cores (Faber-Castell, Bic)', cfop: '5102', category: 'Papelaria' },
  { code: '4016.92.00', description: 'Borrachas escolares brancas de apagar grafite', cfop: '5102', category: 'Papelaria' },
  { code: '8214.10.00', description: 'Apontadores escolares de lápis e tesouras escolares sem ponta', cfop: '5102', category: 'Papelaria' },
  { code: '3506.10.90', description: 'Colas escolares líquidas brancas e colas em bastão (Tenaz, Pritt)', cfop: '5102', category: 'Papelaria' },
  { code: '3919.10.00', description: 'Fitas adesivas transparentes, durex e fitas crepe', cfop: '5102', category: 'Papelaria' },

  // --- PET SHOP E ANIMAIS DOMÉSTICOS ---
  { code: '2309.10.00', description: 'Alimentos para cães ou gatos preparados para venda a retalho (Ração Seca Cães / Gatos / Pedigree, Whiskas, Golden, Premier, Royal Canin)', cfop: '5405', cest: '22.001.00', category: 'Pet Shop' },
  { code: '2309.90.90', description: 'Petiscos para cães e gatos, sachês de ração úmida e bifinhos caninos', cfop: '5405', cest: '22.001.00', category: 'Pet Shop' },
  { code: '3824.99.89', description: 'Areia sanitária higiênica para gatos e tapetes higiênicos para cães', cfop: '5102', category: 'Pet Shop' },
  { code: '4201.00.00', description: 'Coleiras, guias, peitorais e focinheiras para animais', cfop: '5102', category: 'Pet Shop' },

  // --- AUTOPEÇAS, OFICINA MECÂNICA E BORRACHARIA ---
  { code: '4011.10.00', description: 'Pneus novos de borracha para automóveis de passageiros (Pneu Aro 13, 14, 15, 16, 17, 18 / Pirelli, Goodyear, Michelin)', cfop: '5405', cest: '16.001.00', category: 'Autopeças' },
  { code: '4011.40.00', description: 'Pneus novos de borracha para motocicletas e motonetas', cfop: '5405', cest: '16.003.00', category: 'Autopeças' },
  { code: '2710.19.32', description: 'Óleo lubrificante para motores a combustão interna (Óleo Motor 5W30, 10W40, 15W40, 20W50 / Lubrax, Castrol, Mobil)', cfop: '5405', cest: '06.001.00', category: 'Autopeças' },
  { code: '8507.10.10', description: 'Baterias de chumbo para arranque de veículos a motor (Bateria 60Ah, 50Ah, 70Ah / Baterias Moura, Heliar)', cfop: '5405', cest: '01.062.00', category: 'Autopeças' },
  { code: '8708.30.90', description: 'Pastilhas de freio e discos de freio para veículos automotores (Cobreq, Fras-le)', cfop: '5405', cest: '01.033.00', category: 'Autopeças' },
  { code: '8421.23.00', description: 'Filtros de óleo lubrificante para motores a combustão (Tecfil, Fram)', cfop: '5405', cest: '01.018.00', category: 'Autopeças' },
  { code: '8421.31.00', description: 'Filtros de ar para motores automotivos e filtros de cabine/ar-condicionado', cfop: '5405', cest: '01.019.00', category: 'Autopeças' },
  { code: '8421.21.00', description: 'Aparelhos para filtrar ou depurar água potável (Filtro de água, purificador de água, filtro de barro São João, refil de purificador / Lorenzetti, IBBL, Consul)', cfop: '5405', cest: '21.026.00', category: 'Utilidades Domésticas' },
  { code: '4823.20.00', description: 'Papel de filtro e filtros de papel descartáveis para café e chá (Filtro de café Melitta, coador de papel para café)', cfop: '5102', category: 'Utilidades Domésticas e Mercado' },
  { code: '8511.10.00', description: 'Velas de ignição para motores automotivos (NGK, Bosch)', cfop: '5405', cest: '01.067.00', category: 'Autopeças' },
  { code: '8708.80.00', description: 'Amortecedores de suspensão automotiva (Cofap, Monroe)', cfop: '5405', cest: '01.038.00', category: 'Autopeças' },

  // --- CONSTRUÇÃO CIVIL, TINTAS, FERRAGENS E ELÉTRICA ---
  { code: '2523.29.10', description: 'Cimento Portland comum e composto em sacos de 50kg (Cimento Votoran, CP II, CP III)', cfop: '5405', cest: '05.001.00', category: 'Construção' },
  { code: '3209.10.10', description: 'Tintas látex acrílicas e tintas PVA à base de água para parede (Suvinil, Coral, Sherwin-Williams)', cfop: '5405', cest: '24.001.00', category: 'Tintas' },
  { code: '3208.10.10', description: 'Tintas de esmalte sintético e vernizes à base de solvente para madeira e metal', cfop: '5405', cest: '24.002.00', category: 'Tintas' },
  { code: '3214.10.10', description: 'Massa corrida para interiores e massa acrílica para exteriores em latas e barricas', cfop: '5405', cest: '24.003.00', category: 'Tintas' },
  { code: '6907.21.00', description: 'Pisos cerâmicos, azulejos e placas de porcelanato esmaltado para revestimento', cfop: '5405', cest: '18.001.00', category: 'Construção' },
  { code: '8536.50.90', description: 'Interruptores de luz, tomadas elétricas de embutir 10A/20A e placas de acabamento (Pial, Tramontina)', cfop: '5405', cest: '12.001.00', category: 'Material Elétrico' },
  { code: '8536.20.00', description: 'Disjuntores termomagnéticos padrão DIN monofásicos, bifásicos e trifásicos', cfop: '5405', cest: '12.003.00', category: 'Material Elétrico' },
  { code: '8544.49.00', description: 'Fios e cabos elétricos de cobre flexíveis 1,5mm, 2,5mm, 4mm, 6mm e 10mm (Sil, Corfio)', cfop: '5405', cest: '12.005.00', category: 'Material Elétrico' },
  { code: '8539.52.00', description: 'Lâmpadas de LED de bulbo, lâmpadas tubulares LED, painéis plafons e spots LED (Philips, Taschibra, Avant)', cfop: '5405', cest: '09.001.00', category: 'Material Elétrico' },
  { code: '3917.23.00', description: 'Tubos e conexões de PVC soldável para água fria e esgoto predial (Tigre, Amanco)', cfop: '5405', cest: '10.001.00', category: 'Hidráulica' },
  { code: '8481.80.19', description: 'Torneiras de metal e plástico, registros de pressão e registros de gaveta (Deca, Docol, Lorenzetti)', cfop: '5405', cest: '10.010.00', category: 'Hidráulica' },
  { code: '7318.15.00', description: 'Parafusos sextavados, parafusos chipboard, brocantes e autoatarraxantes com porcas e buchas', cfop: '5102', category: 'Ferragens' },
  { code: '8205.40.00', description: 'Chaves de fenda, chaves Philips, chaves combinadas/estrela e jogos de ferramentas manuais', cfop: '5102', category: 'Ferramentas' },
  { code: '8203.20.10', description: 'Alicates universais, alicates de corte e alicates de bico em aço cromo vanádio', cfop: '5102', category: 'Ferramentas' },
  { code: '8205.20.00', description: 'Martelos de unha, marretas e macetas manuais', cfop: '5102', category: 'Ferramentas' },
  { code: '9017.80.10', description: 'Trenas métricas manuais de 3m, 5m, 8m e 10m', cfop: '5102', category: 'Ferramentas' },
  { code: '8467.21.00', description: 'Furadeiras elétricas de impacto e parafusadeiras a bateria 12V/20V (Bosch, Makita, DeWalt)', cfop: '5102', category: 'Ferramentas' },

  // --- BRINQUEDOS, JOGOS E BEBÊS ---
  { code: '9503.00.99', description: 'Brinquedos em geral, bonecas, carrinhos de plástico/metal, blocos de montar tipo Lego, quebra-cabeças e pelúcias', cfop: '5102', category: 'Brinquedos' },
  { code: '9503.00.10', description: 'Triciclos infantis, patinetes, velotróis e carros de pedais', cfop: '5102', category: 'Brinquedos' },
  { code: '9401.80.00', description: 'Cadeiras de segurança para transporte de crianças em automóveis (Bebê conforto)', cfop: '5102', category: 'Bebês' },

  // --- MÓVEIS, COLCHÕES E DECORAÇÃO ---
  { code: '9403.60.00', description: 'Móveis de madeira para quartos e salas (Mesas, Guarda-roupas, Armários de cozinha, Estantes, Racks)', cfop: '5102', category: 'Móveis' },
  { code: '9401.71.00', description: 'Cadeiras estofadas, cadeiras de escritório giratórias e poltronas', cfop: '5102', category: 'Móveis' },
  { code: '9404.21.00', description: 'Colchões de espuma e colchões de molas ensacadas (Casal, Solteiro, Queen, King / Ortobom, Castor)', cfop: '5102', category: 'Colchões' },
  { code: '9404.90.00', description: 'Travesseiros ortopédicos e de plumas, almofadas, edredons e jogos de lençol', cfop: '5102', category: 'Cama e Banho' },
  { code: '6304.92.00', description: 'Capas de almofada, capas de sofá, capas de poltrona e capas para botijão de gás em tecido', cfop: '5102', category: 'Cama, Mesa e Decoração' },
  { code: '6302.31.00', description: 'Capas e protetores de colchão impermeáveis e protetores de travesseiro com zíper', cfop: '5102', category: 'Cama, Mesa e Decoração' },
  { code: '4202.92.00', description: 'Capas, bags acolchoados e estojos para instrumentos musicais (Capa de Violão, Guitarra, Teclado, Baixo, Cavaquinho)', cfop: '5102', category: 'Instrumentos e Acessórios' },

  // --- AUTOPEÇAS, MOTOPEÇAS, PNEUS E ACESSÓRIOS AUTOMOTIVOS ---
  { code: '8714.10.00', description: 'Capas de banco de moto antiderrapantes, capas de assento para motocicleta, guidões, manetes, retrovisores de moto, amortecedores de moto, pastilhas e patins de freio para moto, descanso lateral e peças de motocicleta (Honda, Yamaha, Suzuki, Titan, Fan, Biz, Bros, Twister, Fazer)', cfop: '5405', cest: '01.074.00', category: 'Motopeças e Acessórios' },
  { code: '8708.29.99', description: 'Capas de banco de carro/automóvel em tecido, couro ou neoprene, capas de volante automotivo, capas para cobrir carro impermeáveis, tapetes automotivos de borracha/carpete e acessórios de carroçaria (Gol, Onix, HB20, Corolla, Civic, Uno, Palio)', cfop: '5405', cest: '01.070.00', category: 'Autopeças e Acessórios' },
  { code: '3926.20.00', description: 'Capas de chuva para motoqueiro/motociclista em PVC ou nylon impermeável, conjuntos de chuva, capas de chuva descartáveis e vestuário de plástico', cfop: '5102', cest: '28.061.00', category: 'Vestuário e Proteção' },
  { code: '6506.10.00', description: 'Capacetes de segurança para condutores e passageiros de motocicletas e viseiras (Capacete Moto / Pro Tork, Norisk, LS2, Taurus, Bieffe)', cfop: '5102', category: 'Motopeças e Segurança' },
  { code: '4011.40.00', description: 'Pneus novos de borracha para motocicletas, motonetas, scooters e ciclomotores (Pneu de moto dianteiro/traseiro / Pirelli, Levorin, Rinaldi, Michelin, Maggion)', cfop: '5405', cest: '16.002.00', category: 'Pneumáticos' },
  { code: '4011.10.00', description: 'Pneus novos de borracha para automóveis de passageiros (Pneus aro 13, 14, 15, 16, 17, 18, 19 / Pirelli, Goodyear, Continental, Michelin, Bridgestone)', cfop: '5405', cest: '16.001.00', category: 'Pneumáticos' },
  { code: '4011.50.00', description: 'Pneus novos de borracha para bicicletas (Pneu de bike aro 20, 24, 26, 29 / Kenda, Pirelli, Levorin)', cfop: '5102', category: 'Pneumáticos e Ciclismo' },
  { code: '4013.20.00', description: 'Câmaras de ar de borracha para bicicletas', cfop: '5102', category: 'Pneumáticos e Ciclismo' },
  { code: '4013.90.00', description: 'Câmaras de ar de borracha para motocicletas e automóveis', cfop: '5405', cest: '16.005.00', category: 'Pneumáticos' },
  { code: '2710.19.32', description: 'Óleos lubrificantes minerais, semissintéticos e sintéticos para motores de combustão interna de automóveis e motocicletas (Óleo de motor 5W30, 10W40, 20W50, 15W40 / Mobil, Castrol, Motul, Lubrax, Shell Helix, Havoline, Yamalube)', cfop: '5405', cest: '06.001.00', category: 'Lubrificantes e Automotivo' },
  { code: '8421.23.00', description: 'Filtros de óleo lubrificante e filtros de combustível para motores de combustão interna (Filtro de óleo motor carro/moto / Fram, Tecfil, Mann Filter, Wega, Mahle)', cfop: '5405', cest: '01.054.00', category: 'Autopeças e Filtros' },
  { code: '8421.31.00', description: 'Filtros de ar de admissão para motores de combustão interna e filtros de ar-condicionado de cabine automotivo', cfop: '5405', cest: '01.055.00', category: 'Autopeças e Filtros' },
  { code: '8507.10.10', description: 'Baterias elétricas de chumbo-ácido de 12V para arranque de motores de automóveis e caminhões (Bateria 45Ah, 50Ah, 60Ah, 70Ah / Moura, Heliar, Tudor, Cral)', cfop: '5405', cest: '01.060.00', category: 'Baterias Automotivas' },
  { code: '8507.10.90', description: 'Baterias elétricas de chumbo-ácido de 12V para motocicletas e ciclomotores (Bateria de moto 4Ah, 5Ah, 6Ah, 7Ah, 8Ah / Moura, Yuasa, Route, Pioneiro)', cfop: '5405', cest: '01.061.00', category: 'Baterias Automotivas' },
  { code: '8539.21.10', description: 'Lâmpadas halógenas de tungstênio para faróis de automóveis e motocicletas (Lâmpada H4, H7, H1, H11, Farol Automotivo / Philips, Osram, Tech One)', cfop: '5405', cest: '01.066.00', category: 'Autopeças e Iluminação' },
  { code: '8708.30.90', description: 'Pastilhas de freio, discos de freio e lonas de freio montadas para veículos automóveis (Cobreq, Fras-le, Jurid, Nakata, Fremax)', cfop: '5405', cest: '01.025.00', category: 'Autopeças' },
  { code: '8511.10.00', description: 'Velas de ignição para motores de explosão automotivos e de motocicletas (Vela de ignição NGK, Bosch, Magneti Marelli)', cfop: '5405', cest: '01.062.00', category: 'Autopeças e Ignição' },
  { code: '8708.80.00', description: 'Amortecedores de suspensão para veículos automóveis (Monroe, Cofap, Nakata, Corven)', cfop: '5405', cest: '01.037.00', category: 'Autopeças' },
  { code: '8302.49.00', description: 'Suportes articulados e fixos de parede ou teto para televisores e monitores (Suporte de TV / Suporte articulado para Smart TV)', cfop: '5102', category: 'Acessórios e Ferragens' },
  { code: '8506.10.10', description: 'Pilhas alcalinas tipo AA, AAA (palito), C, D e baterias 9V (Duracell, Panasonic, Rayovac, Energizer)', cfop: '5405', cest: '14.001.00', category: 'Material Elétrico e Pilhas' },
  { code: '9202.90.00', description: 'Instrumentos musicais de cordas (Violão acústico, Violão elétrico, Guitarra, Contrabaixo elétrico, Cavaquinho, Viola)', cfop: '5102', category: 'Instrumentos Musicais' },
  { code: '9206.00.00', description: 'Instrumentos musicais de percussão (Baterias acústicas, baterias eletrônicas, pandeiros, bumbos, pratos)', cfop: '5102', category: 'Instrumentos Musicais' }
];

export const DEFAULT_CFOP_LIST: FiscalCfopRecord[] = [
  { code: '5102', description: 'Venda de mercadoria adquirida ou recebida de terceiros (Operação Interna - Padrão)', type: 'saida', application: 'Comércio varejista comum' },
  { code: '5405', description: 'Venda de mercadoria adquirida ou recebida de terceiros com Substituição Tributária (ST)', type: 'saida', application: 'Bebidas, autopeças, cosméticos em ST' },
  { code: '6102', description: 'Venda de mercadoria adquirida ou recebida de terceiros para outro Estado (Interestadual)', type: 'saida', application: 'Venda para clientes fora da UF' },
  { code: '6404', description: 'Venda de mercadoria com Substituição Tributária para outro Estado (Interestadual)', type: 'saida', application: 'Venda fora da UF em ST' },
  { code: '5101', description: 'Venda de produção própria do estabelecimento', type: 'saida', application: 'Indústrias ou panificadoras' },
  { code: '5929', description: 'Lançamento efetuado em decorrência de Cupom Fiscal emitido anteriormente', type: 'saida', application: 'Faturamento de NFC-e para NF-e' },
  { code: '1102', description: 'Compra para comercialização (Entrada interna)', type: 'entrada', application: 'Entrada de notas de fornecedor' },
  { code: '2102', description: 'Compra para comercialização (Entrada interestadual)', type: 'entrada', application: 'Entrada de notas interestaduais' },
  { code: '5202', description: 'Devolução de compra para comercialização', type: 'saida', application: 'Devoluções ao fornecedor' }
];

export const DEFAULT_CEST_LIST: FiscalCestRecord[] = [
  // --- BEBIDAS (ANEXO IV) ---
  { code: '03.010.00', ncm: '2202.10.00', description: 'Refrigerantes em embalagens PET, lata ou vidro', segment: 'Cervejas, chopes, refrigerantes, águas e outras bebidas' },
  { code: '03.001.00', ncm: '2201.10.00', description: 'Água mineral, gasosa ou não, ou aromatizada', segment: 'Cervejas, chopes, refrigerantes, águas e outras bebidas' },
  { code: '03.021.00', ncm: '2203.00.00', description: 'Cervejas de malte em recipientes de qualquer capacidade', segment: 'Cervejas, chopes, refrigerantes, águas e outras bebidas' },
  { code: '03.011.00', ncm: '2202.99.00', description: 'Bebidas energéticas e isotônicos em embalagens de qualquer capacidade', segment: 'Cervejas, chopes, refrigerantes, águas e outras bebidas' },
  { code: '02.018.00', ncm: '2204.21.00', description: 'Vinhos de uvas frescas e espumantes', segment: 'Bebidas alcoólicas' },
  { code: '02.001.00', ncm: '2208.40.00', description: 'Aguardentes de cana / Cachaça', segment: 'Bebidas alcoólicas' },
  { code: '02.007.00', ncm: '2208.30.20', description: 'Uísques / Whisky em garrafas', segment: 'Bebidas alcoólicas' },
  { code: '02.008.00', ncm: '2208.60.00', description: 'Vodkas em embalagens de qualquer capacidade', segment: 'Bebidas alcoólicas' },

  // --- ELETROELETRÔNICOS E ELETRODOMÉSTICOS (ANEXO XXI) ---
  { code: '21.057.00', ncm: '8518.22.00', description: 'Caixas de som acústicas com múltiplos alto-falantes / Soundbars / Caixas Bluetooth', segment: 'Produtos eletrônicos, eletroeletrônicos e eletrodomésticos' },
  { code: '21.056.00', ncm: '8518.21.00', description: 'Caixas de som acústicas com alto-falante único montado no seu corpo', segment: 'Produtos eletrônicos, eletroeletrônicos e eletrodomésticos' },
  { code: '21.058.00', ncm: '8518.29.00', description: 'Outros alto-falantes e caixas de som acústicas', segment: 'Produtos eletrônicos, eletroeletrônicos e eletrodomésticos' },
  { code: '21.053.00', ncm: '8507.60.00', description: 'Acumuladores elétricos de íons de lítio (Baterias de celular, Power Banks e capas com bateria recarregável incorporada)', segment: 'Produtos eletrônicos, eletroeletrônicos e eletrodomésticos' },
  { code: '21.001.00', ncm: '8418.10.00', description: 'Refrigeradores, combinados e congeladores (Geladeiras e Freezers)', segment: 'Produtos eletrônicos, eletroeletrônicos e eletrodomésticos' },
  { code: '21.004.00', ncm: '8450.11.00', description: 'Máquinas de lavar roupa, de uso doméstico', segment: 'Produtos eletrônicos, eletroeletrônicos e eletrodomésticos' },
  { code: '21.011.00', ncm: '8415.10.11', description: 'Aparelhos de ar-condicionado tipo split system', segment: 'Produtos eletrônicos, eletroeletrônicos e eletrodomésticos' },
  { code: '21.017.00', ncm: '8414.51.10', description: 'Ventiladores de mesa, teto e coluna de uso doméstico', segment: 'Produtos eletrônicos, eletroeletrônicos e eletrodomésticos' },
  { code: '21.020.00', ncm: '8516.50.00', description: 'Fornos de micro-ondas de uso doméstico', segment: 'Produtos eletrônicos, eletroeletrônicos e eletrodomésticos' },
  { code: '21.021.00', ncm: '8516.60.00', description: 'Fornos elétricos, fritadeiras elétricas e fogões de indução', segment: 'Produtos eletrônicos, eletroeletrônicos e eletrodomésticos' },
  { code: '21.028.00', ncm: '8509.40.10', description: 'Liquidificadores e batedeiras de uso doméstico', segment: 'Produtos eletrônicos, eletroeletrônicos e eletrodomésticos' },
  { code: '21.025.00', ncm: '8516.40.00', description: 'Ferros elétricos de passar roupa', segment: 'Produtos eletrônicos, eletroeletrônicos e eletrodomésticos' },
  { code: '21.031.00', ncm: '8516.31.00', description: 'Secadores de cabelo e aparelhos para pentear', segment: 'Produtos eletrônicos, eletroeletrônicos e eletrodomésticos' },
  { code: '21.033.00', ncm: '8508.11.00', description: 'Aspiradores de pó elétricos de uso doméstico', segment: 'Produtos eletrônicos, eletroeletrônicos e eletrodomésticos' },
  { code: '21.024.00', ncm: '8516.10.10', description: 'Chuveiros e duchas elétricas', segment: 'Produtos eletrônicos, eletroeletrônicos e eletrodomésticos' },

  // --- PERFUMARIA, HIGIENE E COSMÉTICOS (ANEXO XX) ---
  { code: '20.001.00', ncm: '3303.00.10', description: 'Perfumes e águas-de-colônia', segment: 'Perfumaria e cosméticos' },
  { code: '20.014.00', ncm: '3304.99.10', description: 'Protetores solares e bronzeadores', segment: 'Perfumaria e cosméticos' },
  { code: '20.005.00', ncm: '3304.10.00', description: 'Produtos de maquiagem para os lábios (Batons)', segment: 'Perfumaria e cosméticos' },
  { code: '20.007.00', ncm: '3304.30.00', description: 'Esmaltes e preparações para unhas', segment: 'Perfumaria e cosméticos' },
  { code: '20.017.00', ncm: '3305.10.00', description: 'Xampus / Shampoos para o cabelo', segment: 'Perfumaria e cosméticos' },
  { code: '20.020.00', ncm: '3305.90.00', description: 'Condicionadores e cremes para cabelo', segment: 'Perfumaria e cosméticos' },
  { code: '20.023.00', ncm: '3306.10.00', description: 'Dentifrícios e cremes dentais', segment: 'Perfumaria e cosméticos' },
  { code: '20.024.00', ncm: '9603.21.00', description: 'Escovas de dentes manuais e elétricas', segment: 'Perfumaria e cosméticos' },
  { code: '20.026.00', ncm: '3307.20.10', description: 'Desodorantes corporais antitranspirantes', segment: 'Perfumaria e cosméticos' },
  { code: '20.034.00', ncm: '3401.11.90', description: 'Sabonetes em barra de toucador', segment: 'Perfumaria e cosméticos' },
  { code: '20.048.00', ncm: '4818.10.00', description: 'Papel higiênico folha simples ou dupla', segment: 'Perfumaria e cosméticos' },
  { code: '20.049.00', ncm: '9619.00.00', description: 'Fraldas descartáveis infantis e geriátricas e absorventes', segment: 'Perfumaria e cosméticos' },

  // --- PRODUTOS DE LIMPEZA (ANEXO XII) ---
  { code: '11.001.00', ncm: '3402.20.00', description: 'Detergentes líquidos para louça', segment: 'Produtos de limpeza' },
  { code: '11.003.00', ncm: '3402.90.39', description: 'Sabão em pó para lavar roupas', segment: 'Produtos de limpeza' },
  { code: '11.005.00', ncm: '3809.91.90', description: 'Amaciantes de roupas', segment: 'Produtos de limpeza' },
  { code: '11.007.00', ncm: '2828.90.11', description: 'Água sanitária e alvejantes clorados', segment: 'Produtos de limpeza' },
  { code: '11.011.00', ncm: '3808.94.19', description: 'Desinfetantes domésticos bactericidas', segment: 'Produtos de limpeza' },
  { code: '11.008.00', ncm: '3405.40.00', description: 'Palhas de aço e esponjas abrasivas', segment: 'Produtos de limpeza' },

  // --- MEDICAMENTOS (ANEXO XIV) ---
  { code: '13.001.00', ncm: '3004.90.99', description: 'Medicamentos alopáticos de uso humano', segment: 'Medicamentos' },

  // --- PET SHOP (ANEXO XXII) ---
  { code: '22.001.00', ncm: '2309.10.00', description: 'Rações tipo pet food para cães e gatos', segment: 'Rações para animais domésticos' },

  // --- AUTOPEÇAS E MOTOPEÇAS (ANEXO II / XVI / VI / XXVIII) ---
  { code: '01.074.00', ncm: '8714.10.00', description: 'Partes e acessórios de motocicletas, motonetas e ciclomotores (Capas de banco de moto, guidões, manetes, retrovisores, amortecedores de moto)', segment: 'Autopeças e Motopeças' },
  { code: '01.070.00', ncm: '8708.29.99', description: 'Outras partes e acessórios de carroçarias para veículos automóveis (Capas de banco de carro, capas de volante, tapetes)', segment: 'Autopeças' },
  { code: '16.001.00', ncm: '4011.10.00', description: 'Pneus novos de borracha para automóveis', segment: 'Pneumáticos e câmaras' },
  { code: '16.002.00', ncm: '4011.40.00', description: 'Pneus novos de borracha para motocicletas', segment: 'Pneumáticos e câmaras' },
  { code: '16.005.00', ncm: '4013.90.00', description: 'Câmaras de ar de borracha para veículos e motocicletas', segment: 'Pneumáticos e câmaras' },
  { code: '06.001.00', ncm: '2710.19.32', description: 'Óleo lubrificante para motores a combustão interna', segment: 'Combustíveis e lubrificantes' },
  { code: '01.060.00', ncm: '8507.10.10', description: 'Acumuladores elétricos de chumbo para arranque de automóveis (Baterias automotivas)', segment: 'Autopeças' },
  { code: '01.061.00', ncm: '8507.10.90', description: 'Acumuladores elétricos de chumbo para motocicletas (Baterias de moto)', segment: 'Autopeças' },
  { code: '01.025.00', ncm: '8708.30.90', description: 'Pastilhas e guarnições de freios montadas para automóveis', segment: 'Autopeças' },
  { code: '01.054.00', ncm: '8421.23.00', description: 'Filtros de óleo de uso automotivo', segment: 'Autopeças' },
  { code: '01.055.00', ncm: '8421.31.00', description: 'Filtros de ar para motores de combustão', segment: 'Autopeças' },
  { code: '01.062.00', ncm: '8511.10.00', description: 'Velas de ignição para motores de combustão', segment: 'Autopeças' },
  { code: '01.066.00', ncm: '8539.21.10', description: 'Lâmpadas halógenas para faróis automotivos', segment: 'Autopeças' },
  { code: '01.037.00', ncm: '8708.80.00', description: 'Amortecedores de suspensão para veículos', segment: 'Autopeças' },
  { code: '14.001.00', ncm: '8506.10.10', description: 'Pilhas e baterias de pilhas, elétricas, de dióxido de manganês', segment: 'Material Elétrico e Pilhas' },
  { code: '28.061.00', ncm: '3926.20.00', description: 'Vestuário e seus acessórios, inclusive luvas, mitenes e semelhantes, de plástico', segment: 'Venda de mercadorias' },

  // --- CONSTRUÇÃO, TINTAS E MATERIAIS ELÉTRICOS ---
  { code: '05.001.00', ncm: '2523.29.10', description: 'Cimento Portland comum ou composto', segment: 'Cimentos' },
  { code: '24.001.00', ncm: '3209.10.10', description: 'Tintas látex acrílicas e PVA à base de água', segment: 'Tintas e vernizes' },
  { code: '24.002.00', ncm: '3208.10.10', description: 'Tintas esmalte sintético e vernizes à base de solvente', segment: 'Tintas e vernizes' },
  { code: '18.001.00', ncm: '6907.21.00', description: 'Placas e pisos cerâmicos e porcelanatos', segment: 'Produtos cerâmicos' },
  { code: '12.001.00', ncm: '8536.50.90', description: 'Interruptores e tomadas de embutir', segment: 'Materiais elétricos' },
  { code: '12.003.00', ncm: '8536.20.00', description: 'Disjuntores termomagnéticos', segment: 'Materiais elétricos' },
  { code: '12.005.00', ncm: '8544.49.00', description: 'Condutores elétricos e fios flexíveis de cobre', segment: 'Materiais elétricos' },
  { code: '09.001.00', ncm: '8539.52.00', description: 'Lâmpadas de LED e tubulares LED', segment: 'Lâmpadas e reatores' },
  { code: '10.001.00', ncm: '3917.23.00', description: 'Tubos e conexões de PVC rígido', segment: 'Materiais de construção' },
  { code: '10.010.00', ncm: '8481.80.19', description: 'Torneiras e válvulas sanitárias de metal ou plástico', segment: 'Materiais de construção' }
];

// ============================================================================
// 2. PARSER DE ARQUIVOS FISCAIS (CSV, XLSX, XLS, JSON, TXT, PDF / CONVÊNIO ICMS 142/18 CONFAZ)
// ============================================================================

// ============================================================================
// 2. PARSER UNIVERSAL PARA IMPORTAÇÃO DE ARQUIVOS FISCAIS
// Suporta:
// - TABELA DO IPI (TIPI) em PDF / XLSX / XLS / CSV / TXT / JSON
// - CONVÊNIO ICMS 142/18 CONFAZ (Substituição Tributária / CEST)
// - TABELA SISCOMEX / MDIC / RECEITA FEDERAL
// - TABELA IBPT / DE OLHO NO IMPOSTO
// - ARQUIVOS SPED FISCAL (EFD ICMS/IPI)
// ============================================================================

export interface ParseResult {
  detectedType: 'ncm' | 'cest' | 'cfop' | 'mixed' | 'convênio_142_18';
  ncmRecords: FiscalNcmRecord[];
  cestRecords: FiscalCestRecord[];
  cfopRecords: FiscalCfopRecord[];
  totalParsed: number;
  fileName: string;
  sourceDoc?: string;
}

/**
 * Normaliza qualquer código NCM para o formato padrão oficial "XXXX.XX.XX" (8 dígitos)
 */
export const normalizeNcmCode = (raw: string | number): string | null => {
  if (!raw) return null;
  const str = String(raw).trim();
  const digits = str.replace(/\D/g, '');
  
  if (digits.length === 8) {
    return `${digits.slice(0, 4)}.${digits.slice(4, 6)}.${digits.slice(6, 8)}`;
  }
  // Se o Excel comeu o zero à esquerda de capítulos 01 a 09 (ex: 1012100 -> 01012100)
  if (digits.length === 7) {
    const padded = '0' + digits;
    return `${padded.slice(0, 4)}.${padded.slice(4, 6)}.${padded.slice(6, 8)}`;
  }
  return null;
};

/**
 * Normaliza qualquer código CEST para o formato padrão oficial "XX.XXX.XX"
 */
export const normalizeCestCode = (raw: string | number): string | null => {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, '');
  if (digits.length === 7) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 7)}`;
  }
  if (digits.length === 6) {
    const padded = '0' + digits;
    return `${padded.slice(0, 2)}.${padded.slice(2, 5)}.${padded.slice(5, 7)}`;
  }
  return null;
};

/**
 * Extrator e Parser inteligente de altíssima precisão para PDFs Fiscais
 * (TIPI / TABELA DO IPI, CONVÊNIO ICMS 142/18 CONFAZ, SISCOMEX, SEFAZ).
 */
export const parseFiscalPdf = async (file: File, mode: 'auto' | 'ncm' | 'cest' | 'cfop' = 'auto'): Promise<ParseResult> => {
  let reconstructedLines: string[] = [];
  let fullRawText = '';

  try {
    const pdfjsLib = await import('pdfjs-dist');
    if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions?.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '6.3.289'}/build/pdf.worker.min.mjs`;
    }

    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ 
      data: new Uint8Array(arrayBuffer),
      useSystemFonts: true,
      disableFontFace: true
    });
    const pdf = await loadingTask.promise;

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const items = (textContent.items || []) as any[];

      if (items.length === 0) continue;

      // Ordena os blocos de texto geometricamente: de cima para baixo (Y decrescente), da esquerda para a direita (X crescente)
      const sortedItems = [...items].sort((a, b) => {
        const yA = Array.isArray(a.transform) ? a.transform[5] : 0;
        const yB = Array.isArray(b.transform) ? b.transform[5] : 0;
        if (Math.abs(yA - yB) > 3.5) {
          return yB - yA; // Top to bottom
        }
        const xA = Array.isArray(a.transform) ? a.transform[4] : 0;
        const xB = Array.isArray(b.transform) ? b.transform[4] : 0;
        return xA - xB; // Left to right
      });

      // Agrupa em linhas reais da tabela do PDF
      let currentY = -99999;
      let currentLine = '';

      for (const item of sortedItems) {
        const str = (item.str || '').trim();
        if (!str && !item.hasEOL) continue;

        const y = Array.isArray(item.transform) ? Math.round(item.transform[5]) : 0;

        if (currentY === -99999) {
          currentY = y;
          currentLine = str;
        } else if (Math.abs(y - currentY) > 3.5 || item.hasEOL) {
          if (currentLine.trim()) {
            reconstructedLines.push(currentLine.trim());
          }
          currentY = y;
          currentLine = str;
        } else {
          currentLine += (currentLine.endsWith(' ') || str.startsWith(' ') ? '' : ' ') + str;
        }
      }

      if (currentLine.trim()) {
        reconstructedLines.push(currentLine.trim());
      }
    }
  } catch (err) {
    console.warn('Tentando fallback para extração binária de texto do PDF:', err);
    try {
      const buffer = await file.arrayBuffer();
      const decoder = new TextDecoder('latin1');
      fullRawText = decoder.decode(buffer);
      reconstructedLines = fullRawText.split(/\r?\n/).filter(l => l.trim().length > 0);
    } catch (_) {
      throw new Error('Não foi possível ler as páginas do arquivo PDF. Verifique se o arquivo não está corrompido ou protegido por senha.');
    }
  }

  fullRawText = reconstructedLines.join('\n');
  const upperDoc = fullRawText.toUpperCase();
  const isConvenio142 = upperDoc.includes('142/18') || upperDoc.includes('CONFAZ') || upperDoc.includes('CEST');
  const isTipi = upperDoc.includes('TIPI') || upperDoc.includes('PRODUTOS INDUSTRIALIZADOS') || upperDoc.includes('INCIDÊNCIA DO IPI') || upperDoc.includes('ALÍQUOTA');

  const cestRecords: FiscalCestRecord[] = [];
  const ncmRecords: FiscalNcmRecord[] = [];
  const cfopRecords: FiscalCfopRecord[] = [];
  const seenCest = new Set<string>();
  const seenNcm = new Set<string>();
  const seenCfop = new Set<string>();

  let currentChapter = '';
  let currentParentPrefix = '';
  let currentParentHeading = '';
  let currentSegment = isConvenio142 ? 'Convênio ICMS 142/18 - CONFAZ' : (isTipi ? 'Tabela TIPI / Receita Federal' : 'Tabela Fiscal');

  for (let i = 0; i < reconstructedLines.length; i++) {
    const line = reconstructedLines[i].trim();
    if (!line || line.startsWith('[PÁGINA')) continue;

    const upperLine = line.toUpperCase();

    // Rastreia Anexos do Convênio 142/18 (ex: ANEXO II - AUTOPEÇAS)
    if (upperLine.includes('ANEXO ') || upperLine.includes('SEGMENTO:')) {
      currentSegment = line.replace(/^[–—-]+\s*/, '').slice(0, 100).trim();
      continue;
    }

    // Rastreia Capítulos (ex: Capítulo 85 - Máquinas, aparelhos e materiais elétricos...)
    if (upperLine.includes('CAPÍTULO') || upperLine.includes('CAPITULO')) {
      currentChapter = line.replace(/^[–—-]+\s*/, '').slice(0, 100).trim();
      continue;
    }

    // Rastreia Posição geral (ex: 85.17 Aparelhos telefônicos...)
    const headingMatch = line.match(/^([0-9]{2}\.[0-9]{2})\s+(.+)/);
    if (headingMatch && !line.match(/[0-9]{2}\.[0-9]{3}\.[0-9]{2}/)) {
      currentParentPrefix = headingMatch[1].slice(0, 2);
      currentParentHeading = headingMatch[2].replace(/^[–—-]+\s*/, '').replace(/\s+(NT|\d+(?:,\d+)?%?)$/i, '').trim();
      continue;
    }

    // =======================================================================
    // 1. FORMATO CONVÊNIO ICMS 142/18 CONFAZ (DETECÇÃO DEDICADA DE CEST)
    // =======================================================================
    const cestMatch = line.match(/\b([0-9]{2}\.[0-9]{3}\.[0-9]{2})\b/) || 
      (isConvenio142 ? line.match(/\b(0[1-9]|1[0-9]|2[0-8])([0-9]{3})([0-9]{2})\b/) : null);

    if (cestMatch && (mode === 'auto' || mode === 'cest')) {
      const rawCest = cestMatch[0];
      const formattedCest = normalizeCestCode(rawCest);

      if (formattedCest) {
        // Remove o código CEST e número de item do início da linha
        let remainder = line.replace(rawCest, '').replace(/^\s*\d+(?:\.\d+)?\s*/, '').trim();

        // Extrai código(s) NCM na linha (8 dígitos, 6 dígitos ou 4 dígitos)
        const ncmMatch = remainder.match(/\b([0-9]{4}\.[0-9]{2}\.[0-9]{2}|[0-9]{8}|[0-9]{4}\.[0-9]{2}|[0-9]{4})\b/);
        let extractedNcm = '';
        if (ncmMatch) {
          extractedNcm = ncmMatch[1];
          const ncmIdx = remainder.indexOf(extractedNcm);
          if (ncmIdx >= 0 && ncmIdx < 35) {
            // Remove o NCM e conectores (ex: "a 8407.34", "e 8714") da descrição
            remainder = remainder.slice(ncmIdx + extractedNcm.length)
              .replace(/^(\s*a\s+[0-9.\s]+|\s*e\s+[0-9.\s]+|[\s,;–—-])+/i, '')
              .trim();
          }
        }

        // Se a descrição na mesma linha for curta, busca continuação na próxima linha
        if (remainder.length < 5 && i + 1 < reconstructedLines.length) {
          const next = reconstructedLines[i + 1].trim();
          if (!next.match(/\b[0-9]{2}\.[0-9]{3}\.[0-9]{2}\b/) && !next.match(/^ANEXO/i) && !next.startsWith('[PÁGINA')) {
            remainder = (remainder ? remainder + ' ' : '') + next;
          }
        }

        const desc = remainder.replace(/^[–—-]+\s*/, '').replace(/\s+/g, ' ').slice(0, 250).trim() || `Mercadoria sujeita à ST (CEST ${formattedCest})`;
        const key = formattedCest + '_' + extractedNcm;

        if (!seenCest.has(key)) {
          seenCest.add(key);
          cestRecords.push({
            code: formattedCest,
            ncm: extractedNcm ? (normalizeNcmCode(extractedNcm) || extractedNcm) : undefined,
            description: desc,
            segment: currentSegment
          });

          // Apenas adiciona ao ncmRecords se NÃO for o modo estrito de CEST
          if (mode !== 'cest' && extractedNcm) {
            const normalizedNcm = normalizeNcmCode(extractedNcm);
            if (normalizedNcm && !seenNcm.has(normalizedNcm)) {
              seenNcm.add(normalizedNcm);
              ncmRecords.push({
                code: normalizedNcm,
                description: desc,
                cest: formattedCest,
                cfop: '5405',
                category: currentSegment
              });
            }
          }
        }
        continue;
      }
    }

    // =======================================================================
    // 2. FORMATO TABELA TIPI / TABELA DE NCM GERAL EM PDF
    // =======================================================================
    if (mode === 'auto' || mode === 'ncm') {
      // Identifica NCMs de 8 dígitos (ex: 8517.13.00 ou 85171300 ou 0101.21.00)
      const ncmMatch = line.match(/\b([0-9]{4}\.[0-9]{2}\.[0-9]{2}|[0-9]{8})\b/);
      if (ncmMatch) {
        const rawNcm = ncmMatch[1];
        const formattedNcm = normalizeNcmCode(rawNcm);

        if (formattedNcm) {
          // Extrai a descrição após o NCM na linha
          let descPart = line.slice(line.indexOf(rawNcm) + rawNcm.length).trim();

          // Remove marcadores de Exceção (Ex 01, Ex 02) e travessões de nível da TIPI
          descPart = descPart.replace(/^Ex\s*\d+\s*/i, '').replace(/^[–—-]+\s*/, '').trim();

          // Remove alíquota no final da linha (ex: NT, 0%, 15%, 3,25%, 15, 0)
          descPart = descPart.replace(/\s+(NT|\d+(?:,\d+)?%?)$/i, '').trim();

          // Se a descrição for curta ou for continuação na linha seguinte
          if (descPart.length < 3 && i + 1 < reconstructedLines.length) {
            const next = reconstructedLines[i + 1].trim();
            if (!next.match(/\b[0-9]{4}\.[0-9]{2}\.[0-9]{2}\b/) && !next.match(/\b[0-9]{8}\b/)) {
              descPart = next.replace(/^Ex\s*\d+\s*/i, '').replace(/^[–—-]+\s*/, '').replace(/\s+(NT|\d+(?:,\d+)?%?)$/i, '').trim();
            }
          }

          // Se a descrição começar com "-- Outros" ou similar, combina com o título da posição pai se pertencer ao mesmo capítulo
          let fullDescription = descPart;
          const itemPrefix = formattedNcm.slice(0, 2);
          if (currentParentHeading && itemPrefix === currentParentPrefix && (descPart.toLowerCase().startsWith('outros') || descPart.toLowerCase().startsWith('outras') || descPart.length < 15)) {
            fullDescription = `${currentParentHeading}: ${descPart}`;
          }

          if (!seenNcm.has(formattedNcm) && (fullDescription.length >= 2 || (itemPrefix === currentParentPrefix && currentParentHeading))) {
            seenNcm.add(formattedNcm);
            ncmRecords.push({
              code: formattedNcm,
              description: fullDescription || currentParentHeading || `Item NCM ${formattedNcm}`,
              cfop: '5102',
              category: currentChapter || currentSegment || 'Tabela TIPI'
            });
          }
        }
      }
    }
  }

  // =======================================================================
  // 3. CAPTURA DE CFOPs NO PDF (MODO CFOP OU CAPTURA AUTOMÁTICA)
  // =======================================================================
  for (let i = 0; i < reconstructedLines.length; i++) {
    const line = reconstructedLines[i].trim();
    if (!line || line.startsWith('[PÁGINA')) continue;

    const cfopMatch = line.match(/\b([123567]\.[0-9]{3}|[123567][0-9]{3})\b/);
    if (cfopMatch) {
      const rawCfop = cfopMatch[0].replace('.', '');
      if (rawCfop.length === 4) {
        let cfopDesc = line.replace(cfopMatch[0], '').replace(/^[–—\s:-]+/, '').trim();
        if (cfopDesc.length < 3 && i + 1 < reconstructedLines.length) {
          const next = reconstructedLines[i + 1].trim();
          if (!next.match(/\b[123567][0-9]{3}\b/)) {
            cfopDesc = (cfopDesc ? cfopDesc + ' ' : '') + next;
          }
        }
        if (!seenCfop.has(rawCfop)) {
          seenCfop.add(rawCfop);
          cfopRecords.push({
            code: rawCfop,
            description: cfopDesc.slice(0, 200) || `Operação Fiscal CFOP ${rawCfop}`,
            type: (rawCfop.startsWith('1') || rawCfop.startsWith('2') || rawCfop.startsWith('3')) ? 'entrada' : 'saida'
          });
        }
      }
    }
  }

  // =======================================================================
  // 4. SCANNER DE RESGATE GLOBAL CASO O PDF TENHA TABELAS COMPLEXAS DE NCM
  // =======================================================================
  if (ncmRecords.length === 0 && mode !== 'cest' && mode !== 'cfop') {
    const globalNcmRegex = /\b([0-9]{4}\.[0-9]{2}\.[0-9]{2})\s+([^\n\r0-9]{3,120})/g;
    let fallbackMatch: RegExpExecArray | null;
    while ((fallbackMatch = globalNcmRegex.exec(fullRawText)) !== null) {
      const code = normalizeNcmCode(fallbackMatch[1]);
      let desc = fallbackMatch[2].replace(/^[–—-]+\s*/, '').replace(/\s+(NT|\d+(?:,\d+)?%?)$/i, '').trim();
      if (code && !seenNcm.has(code) && desc.length >= 3) {
        seenNcm.add(code);
        ncmRecords.push({
          code,
          description: desc,
          cfop: '5102',
          category: currentSegment
        });
      }
    }
  }

  let detectedType: 'ncm' | 'cest' | 'cfop' | 'mixed' | 'convênio_142_18' = 'mixed';
  if (mode === 'cfop' || (cfopRecords.length > 0 && ncmRecords.length === 0 && cestRecords.length === 0)) detectedType = 'cfop';
  else if (mode === 'cest' || (isConvenio142 && cestRecords.length > 0)) detectedType = 'convênio_142_18';
  else if (mode === 'ncm' || (ncmRecords.length > 0 && cestRecords.length === 0)) detectedType = 'ncm';
  else if (cestRecords.length > 0 && ncmRecords.length === 0) detectedType = 'cest';

  const finalNcm = mode === 'cest' || mode === 'cfop' ? [] : ncmRecords;
  const finalCest = mode === 'ncm' || mode === 'cfop' ? [] : cestRecords;
  const finalCfop = mode === 'ncm' || mode === 'cest' ? [] : cfopRecords;

  return {
    detectedType,
    ncmRecords: finalNcm,
    cestRecords: finalCest,
    cfopRecords: finalCfop,
    totalParsed: finalNcm.length + finalCest.length + finalCfop.length,
    fileName: file.name,
    sourceDoc: mode === 'cfop' 
      ? 'Tabela CFOP — SEFAZ / Receita Federal'
      : (mode === 'cest' ? 'Tabela CEST — CONFAZ (Substituição Tributária)' : (isConvenio142 ? 'CONVÊNIO ICMS 142/18 — CONFAZ' : (isTipi ? 'TABELA DO IPI (TIPI) — Receita Federal' : 'Documento Fiscal PDF')))
  };
};

/**
 * PARSER UNIVERSAL E DEDICADO PARA QUALQUER FORMATO FISCAL (XLSX, XLS, CSV, TSV, TXT, JSON, PDF)
 */
export const parseFiscalFile = async (
  file: File, 
  mode: 'auto' | 'ncm' | 'cest' | 'cfop' = 'auto'
): Promise<ParseResult> => {
  const fileName = file.name;
  const extension = fileName.split('.').pop()?.toLowerCase() || '';

  // 1. Roteamento Direto para PDF
  if (extension === 'pdf') {
    return await parseFiscalPdf(file, mode);
  }

  const ncmRecords: FiscalNcmRecord[] = [];
  const cestRecords: FiscalCestRecord[] = [];
  const cfopRecords: FiscalCfopRecord[] = [];
  const seenNcm = new Set<string>();
  const seenCest = new Set<string>();
  const seenCfop = new Set<string>();

  // =========================================================================
  // 2. PARSER UNIVERSAL PARA EXCEL (XLSX / XLS / TIPI / SISCOMEX / IBPT / CONFAZ)
  // =========================================================================
  if (extension === 'xlsx' || extension === 'xls') {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: false, raw: true });

    // Itera por todas as abas da planilha
    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      if (!worksheet) continue;

      const rows2D: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '', raw: false });
      if (!rows2D || rows2D.length === 0) continue;

      let codeColIdx = -1;
      let descColIdx = -1;
      let cestColIdx = -1;
      let cfopColIdx = -1;
      let headerRowIdx = -1;

      // 1. Identifica colunas pelo cabeçalho com pontuação de prioridade
      let bestCodePriority = -1;
      let bestDescPriority = -1;

      for (let r = 0; r < Math.min(30, rows2D.length); r++) {
        const row = rows2D[r];
        if (!row || !Array.isArray(row)) continue;

        for (let c = 0; c < row.length; c++) {
          const rawVal = String(row[c] || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
          if (!rawVal) continue;

          // Pontuação para coluna de NCM / Código Fiscal
          if (rawVal === 'ncm' || rawVal === 'codigo ncm' || rawVal === 'cod_ncm' || rawVal === 'cod. ncm' || rawVal === 'ncm/sh' || rawVal === 'sh/ncm' || rawVal === 'codigo da ncm') {
            if (bestCodePriority < 100) { codeColIdx = c; headerRowIdx = r; bestCodePriority = 100; }
          } else if (rawVal === 'sh' || rawVal === 'classificacao fiscal' || rawVal === 'classificacao') {
            if (bestCodePriority < 80) { codeColIdx = c; headerRowIdx = r; bestCodePriority = 80; }
          } else if (rawVal === 'codigo' || rawVal === 'code' || rawVal === 'posicao' || rawVal === 'subposicao') {
            if (bestCodePriority < 50) { codeColIdx = c; headerRowIdx = r; bestCodePriority = 50; }
          } else if (rawVal === 'item' || rawVal === 'it') {
            if (bestCodePriority < 10) { codeColIdx = c; headerRowIdx = r; bestCodePriority = 10; }
          }

          // Pontuação para coluna de Descrição
          if (rawVal === 'descricao' || rawVal === 'descricao da mercadoria' || rawVal === 'descricao ncm' || rawVal === 'discriminacao' || rawVal === 'mercadoria') {
            if (bestDescPriority < 100) { descColIdx = c; bestDescPriority = 100; }
          } else if (rawVal.includes('descri') || rawVal === 'especificacao' || rawVal === 'denominacao' || rawVal === 'produto' || rawVal === 'texto' || rawVal === 'detalhamento') {
            if (bestDescPriority < 80) { descColIdx = c; bestDescPriority = 80; }
          } else if (rawVal === 'nome' || rawVal === 'titulo') {
            if (bestDescPriority < 50) { descColIdx = c; bestDescPriority = 50; }
          }

          // Pontuação para CEST
          if (rawVal === 'cest' || rawVal === 'cod_cest' || rawVal === 'codigo cest' || rawVal.includes('cest')) {
            cestColIdx = c;
          }

          // Pontuação para CFOP
          if (rawVal === 'cfop' || rawVal === 'cod_cfop' || rawVal === 'codigo cfop' || rawVal === 'cod. cfop' || rawVal.includes('cfop')) {
            cfopColIdx = c;
            if (mode === 'cfop' && bestCodePriority < 100) { codeColIdx = c; headerRowIdx = r; bestCodePriority = 100; }
          }
        }

        if (bestCodePriority >= 80 && bestDescPriority >= 80) break;
      }

      // 2. Se não achou código ou descrição por cabeçalho (ex: layout livre da TIPI Oficial da Receita ou CFOP),
      // faz profiling estatístico das colunas pelos tipos de dados
      const colNcmMatches: Record<number, number> = {};
      const colCfopMatches: Record<number, number> = {};
      const colTextLengths: Record<number, number> = {};

      const maxSampleRows = Math.min(150, rows2D.length);
      for (let r = 0; r < maxSampleRows; r++) {
        const row = rows2D[r];
        if (!row || !Array.isArray(row)) continue;

        for (let c = 0; c < row.length; c++) {
          const val = String(row[c] || '').trim();
          const digits = val.replace(/\D/g, '');

          // Pontua coluna NCM se tiver 8 dígitos ou 7 dígitos (ou 4 dígitos com ponto tipo 01.01)
          if (digits.length === 8 || digits.length === 7 || (digits.length === 4 && val.includes('.'))) {
            colNcmMatches[c] = (colNcmMatches[c] || 0) + 1;
          }

          // Pontua coluna CFOP se tiver 4 dígitos iniciando por 1, 2, 3, 5, 6 ou 7
          if (digits.length === 4 && (digits.startsWith('1') || digits.startsWith('2') || digits.startsWith('3') || digits.startsWith('5') || digits.startsWith('6') || digits.startsWith('7'))) {
            colCfopMatches[c] = (colCfopMatches[c] || 0) + 1;
          }

          // Pontua coluna Descrição se contiver texto longo e letras
          if (val.length > 6 && /[a-zA-ZáéíóúÁÉÍÓÚçÇãõÃÕ]/.test(val) && !val.match(/^(NT|\d+(?:,\d+)?%?)$/i)) {
            colTextLengths[c] = (colTextLengths[c] || 0) + val.length;
          }
        }
      }

      if (codeColIdx === -1) {
        if (mode === 'cfop') {
          let bestCfopCol = -1;
          let maxCfopCount = 0;
          for (const [col, count] of Object.entries(colCfopMatches)) {
            if (count > maxCfopCount) {
              maxCfopCount = count;
              bestCfopCol = Number(col);
            }
          }
          if (bestCfopCol !== -1) codeColIdx = bestCfopCol;
        } else {
          let bestNcmCol = -1;
          let maxNcmCount = 0;
          for (const [col, count] of Object.entries(colNcmMatches)) {
            if (count > maxNcmCount) {
              maxNcmCount = count;
              bestNcmCol = Number(col);
            }
          }
          if (bestNcmCol !== -1) codeColIdx = bestNcmCol;
        }
      }

      if (descColIdx === -1 || descColIdx === codeColIdx) {
        let bestDescCol = -1;
        let maxTextScore = 0;
        for (const [col, score] of Object.entries(colTextLengths)) {
          const cNum = Number(col);
          if (cNum !== codeColIdx && score > maxTextScore) {
            maxTextScore = score;
            bestDescCol = cNum;
          }
        }
        if (bestDescCol !== -1) {
          descColIdx = bestDescCol;
        }
      }

      // Scanner de segurança para modo CFOP ou se encontrou colunas de CFOP
      if (mode === 'cfop' || cfopColIdx !== -1) {
        for (let r = 0; r < rows2D.length; r++) {
          const row = rows2D[r];
          if (!row || !Array.isArray(row)) continue;

          for (let c = 0; c < row.length; c++) {
            const val = String(row[c] || '').trim();
            const digits = val.replace(/\D/g, '');
            if (digits.length === 4 && (digits.startsWith('1') || digits.startsWith('2') || digits.startsWith('3') || digits.startsWith('5') || digits.startsWith('6') || digits.startsWith('7'))) {
              if (!seenCfop.has(digits)) {
                let foundDesc = '';
                for (let c2 = 0; c2 < row.length; c2++) {
                  if (c2 !== c) {
                    const cellTxt = String(row[c2] || '').trim();
                    if (cellTxt.length >= 3 && !cellTxt.match(/^\d+$/) && !cellTxt.toLowerCase().includes('cfop')) {
                      foundDesc = cellTxt;
                      break;
                    }
                  }
                }
                seenCfop.add(digits);
                cfopRecords.push({
                  code: digits,
                  description: foundDesc || `Operação Fiscal CFOP ${digits}`,
                  type: (digits.startsWith('1') || digits.startsWith('2') || digits.startsWith('3')) ? 'entrada' : 'saida'
                });
              }
            }
          }
        }
      }

      // Se ainda não encontrou coluna de código e não estamos em modo CFOP, pula aba
      if (codeColIdx === -1 && mode !== 'cfop') continue;

      const startRow = headerRowIdx >= 0 ? headerRowIdx + 1 : 0;
      let activeHeadingPrefix = '';
      let activeHeadingDesc = '';

      for (let r = startRow; r < rows2D.length; r++) {
        const row = rows2D[r];
        if (!row || !Array.isArray(row) || row.length === 0) continue;

        const rawCode = String(row[codeColIdx] || '').trim();
        let rawDesc = descColIdx !== -1 ? String(row[descColIdx] || '').trim() : '';
        const rawCest = cestColIdx !== -1 ? String(row[cestColIdx] || '').trim() : '';
        const rawCfop = cfopColIdx !== -1 ? String(row[cfopColIdx] || '').trim() : '';

        if (!rawCode && !rawDesc) continue;

        const digitsOnly = rawCode.replace(/\D/g, '');

        // Trata CFOP em linha individual (4 dígitos iniciando por 1, 2, 3, 5, 6, 7)
        if (digitsOnly.length === 4 && (digitsOnly.startsWith('1') || digitsOnly.startsWith('2') || digitsOnly.startsWith('3') || digitsOnly.startsWith('5') || digitsOnly.startsWith('6') || digitsOnly.startsWith('7'))) {
          if (!seenCfop.has(digitsOnly)) {
            seenCfop.add(digitsOnly);
            cfopRecords.push({
              code: digitsOnly,
              description: rawDesc || `Operação Fiscal CFOP ${digitsOnly}`,
              type: (digitsOnly.startsWith('1') || digitsOnly.startsWith('2') || digitsOnly.startsWith('3')) ? 'entrada' : 'saida'
            });
          }
          if (mode === 'cfop') continue;
        }

        // Rastreia posição pai de 4 dígitos para NCM (ex: 01.01 ou 85.17 - Capítulos que não iniciam por prefixos CFOP exclusivos)
        if (mode !== 'cfop' && digitsOnly.length === 4 && (rawCode.includes('.') || rawCode.length === 4)) {
          activeHeadingPrefix = digitsOnly.slice(0, 2);
          if (rawDesc && rawDesc.length > 5) {
            activeHeadingDesc = rawDesc.replace(/^[–—-]+\s*/, '').trim();
          }
          continue;
        }

        // Se o item for de outro capítulo, limpa o heading anterior
        const itemChapterPrefix = digitsOnly.length === 7 ? '0' : digitsOnly.slice(0, 2);
        if (activeHeadingPrefix && itemChapterPrefix !== activeHeadingPrefix) {
          activeHeadingPrefix = '';
          activeHeadingDesc = '';
        }

        // =====================================================================
        // ITEM NCM OFICIAL (8 DÍGITOS OU 7 DÍGITOS COM ZERO À ESQUERDA)
        // =====================================================================
        if (digitsOnly.length === 8 || digitsOnly.length === 7) {
          const formattedNcm = normalizeNcmCode(rawCode);
          if (formattedNcm) {
            // Limpa travessões de nível e marcadores de exceção da TIPI
            rawDesc = rawDesc.replace(/^Ex\s*\d+\s*/i, '').replace(/^[–—-]+\s*/, '').trim();

            let finalDesc = rawDesc;
            if (activeHeadingDesc && (rawDesc.toLowerCase().startsWith('outros') || rawDesc.toLowerCase().startsWith('outras') || rawDesc.length < 15)) {
              finalDesc = `${activeHeadingDesc}: ${rawDesc}`;
            }

            const formattedCest = normalizeCestCode(rawCest);

            if (mode !== 'cest' && !seenNcm.has(formattedNcm)) {
              seenNcm.add(formattedNcm);
              ncmRecords.push({
                code: formattedNcm,
                description: finalDesc || activeHeadingDesc || `Item NCM ${formattedNcm}`,
                cest: formattedCest || undefined,
                cfop: rawCfop || '5102',
                category: sheetName !== 'Sheet1' && sheetName !== 'Planilha1' ? sheetName : undefined
              });
            }

            if (mode !== 'ncm' && formattedCest && !seenCest.has(formattedCest + '_' + formattedNcm)) {
              seenCest.add(formattedCest + '_' + formattedNcm);
              cestRecords.push({
                code: formattedCest,
                ncm: formattedNcm,
                description: finalDesc || activeHeadingDesc || `Mercadoria sujeita à ST - NCM ${formattedNcm}`,
                segment: sheetName !== 'Sheet1' && sheetName !== 'Planilha1' ? sheetName : undefined
              });
            }
          }
        }
        // =====================================================================
        // ITEM CEST (7 DÍGITOS FORMATADOS OU NA COLUNA CEST)
        // =====================================================================
        else if (mode !== 'ncm' && (rawCest || (digitsOnly.length === 7 && rawCode.includes('.')))) {
          const formattedCest = normalizeCestCode(rawCest || rawCode);
          if (formattedCest && !seenCest.has(formattedCest)) {
            seenCest.add(formattedCest);
            cestRecords.push({
              code: formattedCest,
              description: rawDesc || 'Mercadoria Sujeita a Substituição Tributária',
              segment: sheetName
            });
          }
        }
        // =====================================================================
        // ITEM CFOP (4 DÍGITOS VÁLIDOS)
        // =====================================================================
        else if ((mode === 'auto' || mode === 'cfop') && digitsOnly.length === 4 && (digitsOnly.startsWith('1') || digitsOnly.startsWith('2') || digitsOnly.startsWith('5') || digitsOnly.startsWith('6'))) {
          if (!seenCfop.has(digitsOnly)) {
            seenCfop.add(digitsOnly);
            cfopRecords.push({
              code: digitsOnly,
              description: rawDesc || 'Operação fiscal',
              type: (digitsOnly.startsWith('1') || digitsOnly.startsWith('2')) ? 'entrada' : 'saida'
            });
          }
        }
      }
    }
  }
  // =========================================================================
  // 3. PARSER PARA CSV / TSV / TXT / SPED / IBPT / SISCOMEX / CEST
  // =========================================================================
  else if (extension === 'json') {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const rawRows = Array.isArray(parsed) ? parsed : (parsed.data || parsed.records || [parsed]);
    
    rawRows.forEach((row: any) => {
      const code = String(row.code || row.codigo || row.ncm || row.cest || row.cfop || '').trim();
      const desc = String(row.description || row.descricao || row.nome || row.mercadoria || '').trim();
      const formattedNcm = normalizeNcmCode(code);
      const formattedCest = normalizeCestCode(row.cest || code);

      if (mode !== 'cest' && formattedNcm && !seenNcm.has(formattedNcm)) {
        seenNcm.add(formattedNcm);
        ncmRecords.push({ 
          code: formattedNcm, 
          description: desc || `Item NCM ${formattedNcm}`, 
          cfop: row.cfop || '5102', 
          cest: formattedCest || undefined,
          category: row.category || row.categoria || undefined
        });
      }
      if (mode !== 'ncm' && formattedCest && !seenCest.has(formattedCest)) {
        seenCest.add(formattedCest);
        cestRecords.push({
          code: formattedCest,
          ncm: formattedNcm || undefined,
          description: desc || 'Mercadoria sujeita à ST',
          segment: row.segment || row.categoria || undefined
        });
      }
    });
  } else {
    // CSV / TSV / TXT / SPED PIPE DELIMITED
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
    
    if (lines.length > 0) {
      const sampleLines = lines.slice(0, 10).join('\n');
      const delimiters = [';', ',', '\t', '|'];
      let bestDelimiter = ';';
      let maxCount = 0;

      for (const d of delimiters) {
        const count = sampleLines.split(d).length;
        if (count > maxCount) {
          maxCount = count;
          bestDelimiter = d;
        }
      }

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const cols = line.split(bestDelimiter).map(c => c.trim().replace(/^["']|["']$/g, ''));
        if (cols.length === 0) continue;

        // Trata formato SPED (ex: |0200|COD_ITEM|DESCR_ITEM|...|COD_NCM|...|CEST|)
        if (cols[1] === '0200') {
          const spedDesc = cols[3] || '';
          const spedNcm = normalizeNcmCode(cols[8] || cols[7] || '');
          const spedCest = normalizeCestCode(cols[13] || cols[12] || cols[10] || '');
          if (mode !== 'cest' && spedNcm && !seenNcm.has(spedNcm)) {
            seenNcm.add(spedNcm);
            ncmRecords.push({
              code: spedNcm,
              description: spedDesc || `Item ${spedNcm}`,
              cfop: '5102',
              cest: spedCest || undefined
            });
          }
          if (mode !== 'ncm' && spedCest && !seenCest.has(spedCest)) {
            seenCest.add(spedCest);
            cestRecords.push({
              code: spedCest,
              ncm: spedNcm || undefined,
              description: spedDesc || `Mercadoria CEST ${spedCest}`
            });
          }
          continue;
        }

        // Se for arquivo SPED pipe-delimited e não for 0200, pula linhas de outros blocos
        if (bestDelimiter === '|' && cols[1] && cols[1].length === 4) {
          continue;
        }

        // CSV padrão
        for (let c = 0; c < Math.min(5, cols.length); c++) {
          const val = cols[c];
          const formattedNcm = normalizeNcmCode(val);
          const formattedCest = normalizeCestCode(val);
          const digitsVal = val.replace(/\D/g, '');

          if (mode !== 'cest' && mode !== 'cfop' && formattedNcm) {
            let desc = (cols[c + 1] || cols[c + 2] || cols[c + 3] || '').replace(/^[–—-]+\s*/, '').trim();
            if (!seenNcm.has(formattedNcm) && desc.length >= 2) {
              seenNcm.add(formattedNcm);
              ncmRecords.push({
                code: formattedNcm,
                description: desc,
                cfop: '5102'
              });
            }
            break;
          } else if (mode !== 'ncm' && mode !== 'cfop' && formattedCest) {
            let desc = (cols[c + 1] || cols[c + 2] || cols[c + 3] || '').replace(/^[–—-]+\s*/, '').trim();
            if (!seenCest.has(formattedCest) && desc.length >= 2) {
              seenCest.add(formattedCest);
              cestRecords.push({
                code: formattedCest,
                description: desc
              });
            }
            break;
          } else if (digitsVal.length === 4 && (digitsVal.startsWith('1') || digitsVal.startsWith('2') || digitsVal.startsWith('3') || digitsVal.startsWith('5') || digitsVal.startsWith('6') || digitsVal.startsWith('7'))) {
            let desc = (cols[c + 1] || cols[c + 2] || cols[c + 3] || '').replace(/^[–—-]+\s*/, '').trim();
            if (!seenCfop.has(digitsVal) && desc.length >= 2) {
              seenCfop.add(digitsVal);
              cfopRecords.push({
                code: digitsVal,
                description: desc,
                type: (digitsVal.startsWith('1') || digitsVal.startsWith('2') || digitsVal.startsWith('3')) ? 'entrada' : 'saida'
              });
            }
          }
        }
      }
    }
  }

  const finalNcm = mode === 'cest' || mode === 'cfop' ? [] : ncmRecords;
  const finalCest = mode === 'ncm' || mode === 'cfop' ? [] : cestRecords;
  const finalCfop = mode === 'ncm' || mode === 'cest' ? cfopRecords : cfopRecords;

  let detectedType: 'ncm' | 'cest' | 'cfop' | 'mixed' = mode === 'ncm' ? 'ncm' : (mode === 'cest' ? 'cest' : (mode === 'cfop' ? 'cfop' : 'mixed'));
  if (mode === 'auto') {
    if (finalNcm.length > 0 && finalCest.length === 0 && finalCfop.length === 0) detectedType = 'ncm';
    else if (finalCest.length > 0 && finalNcm.length === 0) detectedType = 'cest';
    else if (finalCfop.length > 0 && finalNcm.length === 0) detectedType = 'cfop';
  }

  return {
    detectedType,
    ncmRecords: finalNcm,
    cestRecords: finalCest,
    cfopRecords: finalCfop,
    totalParsed: finalNcm.length + finalCest.length + finalCfop.length,
    fileName,
    sourceDoc: mode === 'ncm' 
      ? 'Tabela NCM / TIPI / Receita Federal' 
      : (mode === 'cest' ? 'Tabela CEST — CONFAZ (Substituição Tributária)' : (mode === 'cfop' ? 'Tabela CFOP — SEFAZ / Receita Federal' : (extension === 'xlsx' || extension === 'xls' ? 'Planilha Fiscal (Excel TIPI/SISCOMEX)' : 'Arquivo Fiscal')))
  };
};

export const parseDedicatedNcmFile = async (file: File): Promise<ParseResult> => {
  return await parseFiscalFile(file, 'ncm');
};

export const parseDedicatedCestFile = async (file: File): Promise<ParseResult> => {
  return await parseFiscalFile(file, 'cest');
};

export const parseDedicatedCfopFile = async (file: File): Promise<ParseResult> => {
  return await parseFiscalFile(file, 'cfop');
};

// ============================================================================
// 3. PERSISTÊNCIA E SINCRONIZAÇÃO NO BANCO (SUPABASE CLOUD_DATA & DEXIE LOCAL)
// ============================================================================

export const saveFiscalDatasets = async (
  ncmList: FiscalNcmRecord[], 
  cestList: FiscalCestRecord[], 
  cfopList: FiscalCfopRecord[]
) => {
  try {
    // 1. Salvar no Dexie (IndexedDB local) para acesso offline e pesquisa imediata
    if (typeof window !== 'undefined' && db?.fiscalNcm) {
      if (ncmList.length > 0) await db.fiscalNcm.bulkPut(ncmList).catch(() => {});
      if (cestList.length > 0) await db.fiscalCest.bulkPut(cestList).catch(() => {});
      if (cfopList.length > 0) await db.fiscalCfop.bulkPut(cfopList).catch(() => {});
    }

    // 2. Salvar no Supabase (cloud_data com tenant_id = 'SYSTEM')
    // Salva o dataset global para que todas as lojas acessem as atualizações
    const now = new Date().toISOString();

    const promises: any[] = [
      supabase.from('cloud_data').upsert({
        tenant_id: 'SYSTEM',
        store_key: 'fiscal_ncm_dataset',
        data_json: { records: ncmList, updatedAt: now, total: ncmList.length },
        updated_at: now
      }, { onConflict: 'tenant_id,store_key' }),
      supabase.from('cloud_data').upsert({
        tenant_id: 'SYSTEM',
        store_key: 'fiscal_cest_dataset',
        data_json: { records: cestList, updatedAt: now, total: cestList.length },
        updated_at: now
      }, { onConflict: 'tenant_id,store_key' }),
      supabase.from('cloud_data').upsert({
        tenant_id: 'SYSTEM',
        store_key: 'fiscal_cfop_dataset',
        data_json: { records: cfopList, updatedAt: now, total: cfopList.length },
        updated_at: now
      }, { onConflict: 'tenant_id,store_key' })
    ];

    await Promise.all(promises);

    // 3. Tenta também gravar nas tabelas dedicadas (fiscal_ncm, fiscal_cest, fiscal_cfop) caso o usuário tenha rodado o script SQL
    try {
      if (ncmList.length > 0) {
        const topNcms = ncmList.slice(0, 500).map(r => ({
          code: r.code,
          description: r.description,
          cfop: r.cfop || '5102',
          cest: r.cest || null,
          category: r.category || null,
          aliquota_nac: r.aliquotaNac || 0,
          aliquota_imp: r.aliquotaImp || 0,
          updated_at: now
        }));
        try {
          await supabase.from('fiscal_ncm').upsert(topNcms, { onConflict: 'code' });
        } catch (_) {}
      }
      if (cestList.length > 0) {
        const topCests = cestList.slice(0, 500).map(r => ({
          code: r.code,
          ncm: r.ncm || null,
          description: r.description,
          segment: r.segment || null,
          updated_at: now
        }));
        try {
          await supabase.from('fiscal_cest').upsert(topCests, { onConflict: 'code' });
        } catch (_) {}
      }
      if (cfopList.length > 0) {
        const topCfops = cfopList.slice(0, 100).map(r => ({
          code: r.code,
          description: r.description,
          type: r.type || 'saida',
          application: r.application || null,
          updated_at: now
        }));
        try {
          await supabase.from('fiscal_cfop').upsert(topCfops, { onConflict: 'code' });
        } catch (_) {}
      }
    } catch (_) {}

    return { success: true };
  } catch (err: any) {
    console.warn('Aviso ao persistir dados fiscais no banco:', err);
    return { success: false, error: err.message };
  }
};

export const clearAllFiscalDatasets = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    const now = new Date().toISOString();

    // 1. Limpa IndexedDB local
    if (typeof window !== 'undefined' && db) {
      if (db.fiscalNcm) await db.fiscalNcm.clear().catch(() => {});
      if (db.fiscalCest) await db.fiscalCest.clear().catch(() => {});
      if (db.fiscalCfop) await db.fiscalCfop.clear().catch(() => {});
    }

    // 2. Limpa dados no Supabase para tenant_id = 'SYSTEM'
    const promises = [
      supabase.from('cloud_data').upsert({
        tenant_id: 'SYSTEM',
        store_key: 'fiscal_ncm_dataset',
        data_json: { records: [], updatedAt: now, total: 0 },
        updated_at: now
      }, { onConflict: 'tenant_id,store_key' }),
      supabase.from('cloud_data').upsert({
        tenant_id: 'SYSTEM',
        store_key: 'fiscal_cest_dataset',
        data_json: { records: [], updatedAt: now, total: 0 },
        updated_at: now
      }, { onConflict: 'tenant_id,store_key' }),
      supabase.from('cloud_data').upsert({
        tenant_id: 'SYSTEM',
        store_key: 'fiscal_cfop_dataset',
        data_json: { records: [], updatedAt: now, total: 0 },
        updated_at: now
      }, { onConflict: 'tenant_id,store_key' })
    ];

    await Promise.all(promises);

    // 3. Limpa tabelas dedicadas se existirem
    try {
      await supabase.from('fiscal_ncm').delete().neq('code', '__NONE__');
      await supabase.from('fiscal_cest').delete().neq('code', '__NONE__');
      await supabase.from('fiscal_cfop').delete().neq('code', '__NONE__');
    } catch (_) {}

    return { success: true };
  } catch (err: any) {
    console.error('Erro ao limpar toda a base fiscal global:', err);
    return { success: false, error: err.message };
  }
};

export const loadFiscalDatasets = async (): Promise<{
  ncm: FiscalNcmRecord[];
  cest: FiscalCestRecord[];
  cfop: FiscalCfopRecord[];
}> => {
  let ncm: FiscalNcmRecord[] = [];
  let cest: FiscalCestRecord[] = [];
  let cfop: FiscalCfopRecord[] = [];

  try {
    // 1. Tentar IndexedDB primeiro se estiver no navegador
    if (typeof window !== 'undefined' && db?.fiscalNcm) {
      const localNcm = await db.fiscalNcm.toArray().catch(() => []);
      const localCest = await db.fiscalCest.toArray().catch(() => []);
      const localCfop = await db.fiscalCfop.toArray().catch(() => []);

      if (localNcm.length > 0) ncm = localNcm;
      if (localCest.length > 0) cest = localCest;
      if (localCfop.length > 0) cfop = localCfop;
    }

    // 2. Se local estiver vazio, buscar do Supabase (cloud_data)
    if (ncm.length === 0 || cest.length === 0 || cfop.length === 0) {
      const { data } = await supabase
        .from('cloud_data')
        .select('store_key, data_json')
        .eq('tenant_id', 'SYSTEM')
        .in('store_key', ['fiscal_ncm_dataset', 'fiscal_cest_dataset', 'fiscal_cfop_dataset']);

      if (data && data.length > 0) {
        data.forEach(item => {
          if (item.store_key === 'fiscal_ncm_dataset' && item.data_json?.records) {
            ncm = item.data_json.records;
            db.fiscalNcm.bulkPut(ncm).catch(() => {});
          }
          if (item.store_key === 'fiscal_cest_dataset' && item.data_json?.records) {
            cest = item.data_json.records;
            db.fiscalCest.bulkPut(cest).catch(() => {});
          }
          if (item.store_key === 'fiscal_cfop_dataset' && item.data_json?.records) {
            cfop = item.data_json.records;
            db.fiscalCfop.bulkPut(cfop).catch(() => {});
          }
        });
      }
    }

    // 3. Se ainda estiver vazio, tentar buscar da tabela dedicada fiscal_ncm caso exista
    if (ncm.length === 0) {
      try {
        const { data: ncmData } = await supabase.from('fiscal_ncm').select('code, description, cfop, cest, category, aliquota_nac, aliquota_imp').limit(1000);
        if (ncmData && ncmData.length > 0) {
          ncm = ncmData.map(r => ({
            code: r.code,
            description: r.description,
            cfop: r.cfop,
            cest: r.cest,
            category: r.category,
            aliquotaNac: r.aliquota_nac,
            aliquotaImp: r.aliquota_imp
          }));
          db.fiscalNcm.bulkPut(ncm).catch(() => {});
        }
      } catch (_) {}
    }
  } catch (err) {
    console.warn('Erro ao carregar datasets fiscais:', err);
  }

  // 3. Mescla sempre com os padrões oficiais embutidos para garantir que itens essenciais nunca fiquem sem NCM
  const mergedNcmMap = new Map<string, FiscalNcmRecord>();
  DEFAULT_NCM_LIST.forEach(item => mergedNcmMap.set(item.code, item));
  ncm.forEach(item => {
    const existing = mergedNcmMap.get(item.code);
    if (existing) {
      mergedNcmMap.set(item.code, { ...existing, ...item });
    } else {
      mergedNcmMap.set(item.code, item);
    }
  });
  ncm = Array.from(mergedNcmMap.values());

  const mergedCestMap = new Map<string, FiscalCestRecord>();
  DEFAULT_CEST_LIST.forEach(item => mergedCestMap.set(item.code, item));
  cest.forEach(item => {
    const existing = mergedCestMap.get(item.code);
    if (existing) {
      mergedCestMap.set(item.code, { ...existing, ...item });
    } else {
      mergedCestMap.set(item.code, item);
    }
  });
  cest = Array.from(mergedCestMap.values());

  const mergedCfopMap = new Map<string, FiscalCfopRecord>();
  DEFAULT_CFOP_LIST.forEach(item => mergedCfopMap.set(item.code, item));
  cfop.forEach(item => {
    const existing = mergedCfopMap.get(item.code);
    if (existing) {
      mergedCfopMap.set(item.code, { ...existing, ...item });
    } else {
      mergedCfopMap.set(item.code, item);
    }
  });
  cfop = Array.from(mergedCfopMap.values());

  return { ncm, cest, cfop };
};

// ============================================================================
// 4. ALGORITMO DE MATCHING INTELIGENTE POR NOME DO PRODUTO (EX: "ARROZ")
// ============================================================================

const cleanTokens = (str: string): string[] => {
  let normalized = str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  // Preserva e desdobra termos compostos essenciais antes de limpar pontuações
  if (normalized.includes('caixa de som') || normalized.includes('caixinha de som') || normalized.includes('caixa som') || normalized.includes('caixinha som')) {
    normalized = normalized.replace(/caix(a|inha)\s*(de\s*)?som/g, 'caixasom som acustica altofalante ');
  }
  if (normalized.includes('fone de ouvido') || normalized.includes('fone ouvido') || normalized.includes('fones de ouvido')) {
    normalized = normalized.replace(/fones?\s*(de\s*)?ouvido/g, 'fone foneouvido headset ');
  }
  if (normalized.includes('soundbar') || normalized.includes('sound bar')) {
    normalized += ' caixasom som acustica';
  }
  if (normalized.includes('alto falante') || normalized.includes('alto-falante')) {
    normalized += ' altofalante som';
  }
  if (normalized.includes('relogio') || normalized.includes('smartwatch') || normalized.includes('smart watch')) {
    normalized += ' relogio pulso relogios';
  }
  if (normalized.includes('oculos') || normalized.includes('armacao')) {
    normalized += ' oculos grau sol';
  }
  if (normalized.includes('airfryer') || normalized.includes('air fryer') || normalized.includes('fritadeira')) {
    normalized += ' fritadeira eletrica fornos';
  }
  if (normalized.includes('smart tv') || normalized.includes('televisao') || normalized.includes('smarttv')) {
    normalized += ' televisores televisao led';
  }
  if (normalized.includes('ar condicionado') || normalized.includes('ar-condicionado')) {
    normalized += ' arcondicionado split inverter';
  }
  if (normalized.includes('maquina de lavar') || normalized.includes('lava e seca')) {
    normalized += ' lavar roupa lavaroupa';
  }
  if (normalized.includes('chave de fenda') || normalized.includes('chave philips')) {
    normalized += ' chaves ferramentas fenda';
  }
  if (normalized.includes('papel a4') || normalized.includes('papel sulfite')) {
    normalized += ' sulfite papelaria resma';
  }
  if (normalized.includes('oleo de motor') || normalized.includes('oleo lubrificante') || normalized.includes('oleo motor')) {
    normalized += ' lubrificante motor automotivo';
  }
  if (normalized.includes('capa') || normalized.includes('capas') || normalized.includes('capinha') || normalized.includes('capinhas') || normalized.includes('case') || normalized.includes('cases')) {
    normalized += ' capa capinha case protetora';
  }
  if (normalized.includes('pelicula') || normalized.includes('peliculas')) {
    normalized += ' pelicula peliculas vidro temperado';
  }
  if (normalized.includes('carregador') || normalized.includes('carregadores')) {
    normalized += ' carregador carregadores fonte adaptador';
  }
  if (normalized.includes('celular') || normalized.includes('celulares') || normalized.includes('smartphone') || normalized.includes('smartphones')) {
    normalized += ' celular celulares smartphone';
  }

  const cleaned = normalized.replace(/[^a-z0-9_\s]/g, " ");

  const stopwords = new Set([
    'de', 'do', 'da', 'dos', 'das', 'para', 'com', 'sem', 'em', 'um', 'uma',
    'por', 'tipo', 'kg', 'g', 'gr', 'ml', 'l', 'litro', 'litros', 'un', 'unid', 'unidade',
    'pacote', 'pct', 'fardo', 'fd', 'premium', 'extra', 'especial'
  ]);

  return cleaned
    .split(/\s+/)
    .filter(t => t.length > 1 && !stopwords.has(t));
};

export const findMatchingFiscalData = async (
  productName: string, 
  productCategory?: string,
  cachedNcmList?: FiscalNcmRecord[],
  cachedCestList?: FiscalCestRecord[]
): Promise<FiscalMatchResult> => {
  const cleanName = (productName || '').trim();
  if (!cleanName) {
    return {
      ncm: '8517.79.00',
      ncmDescription: 'Padrão / Peças e Mercadorias Gerais',
      cfop: '5102',
      confidence: 'low',
      source: 'default'
    };
  }

  const dataset = await loadFiscalDatasets();
  const ncmSource = cachedNcmList && cachedNcmList.length > 0 
    ? cachedNcmList 
    : dataset.ncm;
  const cestSource = cachedCestList && cachedCestList.length > 0
    ? cachedCestList
    : dataset.cest;

  const productTokens = cleanTokens(cleanName);
  const categoryTokens = productCategory ? cleanTokens(productCategory) : [];
  const allSearchTokens = [...productTokens, ...categoryTokens];

  let bestMatch: FiscalNcmRecord | null = null;
  let highestScore = -1;
  const scoredList: Array<{ record: FiscalNcmRecord; score: number }> = [];

  for (const ncm of ncmSource) {
    let score = 0;
    const descTokens = cleanTokens(ncm.description);
    const categoryTokensNcm = ncm.category ? cleanTokens(ncm.category) : [];
    const allNcmTokens = new Set([...descTokens, ...categoryTokensNcm]);

    // Regras de pontuação para o primeiro token do produto
    const primaryToken = productTokens[0];
    if (primaryToken && allNcmTokens.has(primaryToken)) {
      score += 50;
    }

    // Pontua tokens adicionais
    for (const pToken of productTokens) {
      if (allNcmTokens.has(pToken)) {
        score += 20;
      } else {
        for (const nToken of allNcmTokens) {
          if (nToken.includes(pToken) || pToken.includes(nToken)) {
            score += 10;
            break;
          }
        }
      }
    }

    // Bônus de categoria
    if (categoryTokens.length > 0) {
      for (const cToken of categoryTokens) {
        if (allNcmTokens.has(cToken)) {
          score += 15;
        }
      }
    }

    // Regras com boosts taxonômicos para garantir 100% de acerto nas categorias comerciais
    const lowerName = cleanName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    // 1. Relógios, Smartwatches e Ótica
    if (lowerName.includes('relogio') || lowerName.includes('smartwatch') || lowerName.includes('smart watch') || lowerName.includes('smartband')) {
      if (lowerName.includes('smartwatch') || lowerName.includes('smart watch') || lowerName.includes('inteligente') || lowerName.includes('apple watch') || lowerName.includes('galaxy watch') || lowerName.includes('mi band')) {
        if (ncm.code === '8517.62.77') score += 200;
        else if (ncm.code.startsWith('9102.12')) score += 120;
      } else if (lowerName.includes('digital') || lowerName.includes('casio') || lowerName.includes('g-shock') || lowerName.includes('esportivo')) {
        if (ncm.code === '9102.12.20') score += 200;
      } else if (lowerName.includes('parede') || lowerName.includes('despertador')) {
        if (ncm.code.startsWith('9105')) score += 200;
      } else {
        if (ncm.code.startsWith('9102.11')) score += 200;
        else if (ncm.code.startsWith('9102')) score += 150;
      }
    }

    // 2. Óculos e Armações
    if (lowerName.includes('oculos') || lowerName.includes('armacao') || lowerName.includes('lente')) {
      if (lowerName.includes('sol') || lowerName.includes('solar') || lowerName.includes('escuro') || lowerName.includes('ray ban') || lowerName.includes('ray-ban')) {
        if (ncm.code.startsWith('9004.10')) score += 200;
      } else if (lowerName.includes('armacao') || lowerName.includes('grau')) {
        if (ncm.code.startsWith('9003.11') || ncm.code.startsWith('9003.19')) score += 200;
      } else if (lowerName.includes('lente')) {
        if (ncm.code.startsWith('9001.50')) score += 200;
      } else if (lowerName.includes('oculos')) {
        if (ncm.code.startsWith('9004.10')) score += 180;
      }
    }

    // 3. Bolsas, Mochilas, Carteiras, Cintos e Joias
    if ((lowerName.includes('bolsa') || lowerName.includes('clutch') || lowerName.includes('tiracolo')) && ncm.code.startsWith('4202.22')) score += 180;
    if ((lowerName.includes('mochila') || lowerName.includes('mala') || lowerName.includes('maleta')) && ncm.code.startsWith('4202.12')) score += 180;
    if ((lowerName.includes('carteira') || lowerName.includes('porta cartao') || lowerName.includes('porta moeda')) && ncm.code.startsWith('4202.31')) score += 180;
    if (lowerName.includes('cinto') && ncm.code.startsWith('4203.30')) score += 180;
    if ((lowerName.includes('brinco') || lowerName.includes('colar') || lowerName.includes('pulseira') || lowerName.includes('anel') || lowerName.includes('semijoia') || lowerName.includes('bijuteria')) && ncm.code.startsWith('7117.19')) score += 180;

    // 4. Eletrodomésticos e Climatização
    if ((lowerName.includes('geladeira') || lowerName.includes('refrigerador') || lowerName.includes('freezer')) && ncm.code.startsWith('8418.10')) score += 200;
    if ((lowerName.includes('lavar') || lowerName.includes('lava e seca') || lowerName.includes('tanquinho')) && ncm.code.startsWith('8450.11')) score += 200;
    if ((lowerName.includes('ar condicionado') || lowerName.includes('ar-condicionado') || lowerName.includes('split') || lowerName.includes('inverter')) && ncm.code.startsWith('8415.10')) score += 200;
    if (lowerName.includes('ventilador') && ncm.code.startsWith('8414.51')) score += 200;
    if ((lowerName.includes('microondas') || lowerName.includes('micro-ondas')) && ncm.code.startsWith('8516.50')) score += 200;
    if ((lowerName.includes('airfryer') || lowerName.includes('air fryer') || lowerName.includes('fritadeira') || lowerName.includes('fogao eletrico')) && ncm.code.startsWith('8516.60')) score += 200;
    if ((lowerName.includes('cafeteira') || lowerName.includes('nespresso') || lowerName.includes('dolce gusto')) && ncm.code.startsWith('8516.71')) score += 200;
    if ((lowerName.includes('liquidificador') || lowerName.includes('batedeira') || lowerName.includes('processador')) && ncm.code.startsWith('8509.40')) score += 200;
    if ((lowerName.includes('ferro de passar') || lowerName.includes('ferro vapor')) && ncm.code.startsWith('8516.40')) score += 200;
    if ((lowerName.includes('secador de cabelo') || lowerName.includes('chapinha') || lowerName.includes('prancha alisadora')) && ncm.code.startsWith('8516.31')) score += 200;
    if ((lowerName.includes('aspirador de po') || lowerName.includes('aspirador vertical') || lowerName.includes('aspirador robo')) && ncm.code.startsWith('8508.11')) score += 200;
    if ((lowerName.includes('chuveiro') || lowerName.includes('ducha eletrica')) && ncm.code.startsWith('8516.10')) score += 200;

    // ========================================================================
    // MOTOR DE DESAMBIGUAÇÃO SEMÂNTICA CONTEXTUAL (N-GRAMAS E QUALIFICADORES)
    // ========================================================================
    const hasDomainMoto = (
      lowerName.includes('moto') || lowerName.includes('motocicleta') || lowerName.includes('motoneta') ||
      lowerName.includes('motoqueiro') || lowerName.includes('motociclista') || lowerName.includes('motoboy') ||
      lowerName.includes('titan') || lowerName.includes('fan') || lowerName.includes('biz') ||
      lowerName.includes('twister') || lowerName.includes('fazer') || lowerName.includes('bros') ||
      lowerName.includes('cb 300') || lowerName.includes('cb 500') || lowerName.includes('cb 600') ||
      lowerName.includes('hornet') || lowerName.includes('xj6') || lowerName.includes('yamaha') ||
      lowerName.includes('honda cg') || lowerName.includes('suzuki') || lowerName.includes('kawasaki') ||
      lowerName.includes('scooter') || lowerName.includes('ciclomotor') || lowerName.includes('crosser')
    );

    const hasDomainCarro = (
      lowerName.includes('carro') || lowerName.includes('automovel') || lowerName.includes('veiculo') ||
      lowerName.includes('veicular') || lowerName.includes('automotivo') || lowerName.includes('caminhao') ||
      lowerName.includes('camionete') || lowerName.includes('gol') || lowerName.includes('onix') ||
      lowerName.includes('hb20') || lowerName.includes('palio') || lowerName.includes('uno') ||
      lowerName.includes('corolla') || lowerName.includes('civic') || lowerName.includes('celta') ||
      lowerName.includes('corsa') || lowerName.includes('saveiro') || lowerName.includes('strada') ||
      lowerName.includes('hilux') || lowerName.includes('s10') || lowerName.includes('renegade') ||
      lowerName.includes('compass') || lowerName.includes('volkswagen') || lowerName.includes('chevrolet') ||
      lowerName.includes('fiat') || lowerName.includes('ford') || lowerName.includes('toyota') || lowerName.includes('hyundai')
    );

    const hasDomainPhone = (
      lowerName.includes('celular') || lowerName.includes('celulares') || lowerName.includes('smartphone') ||
      lowerName.includes('smartphones') || lowerName.includes('iphone') || lowerName.includes('samsung galaxy') ||
      lowerName.includes('galaxy') || lowerName.includes('xiaomi') || lowerName.includes('redmi') ||
      lowerName.includes('poco') || lowerName.includes('motorola') || lowerName.includes('moto g') ||
      lowerName.includes('moto e') || lowerName.includes('tablet') || lowerName.includes('ipad')
    );

    const hasDomainHomeDeco = (
      lowerName.includes('almofada') || lowerName.includes('sofa') || lowerName.includes('poltrona') ||
      lowerName.includes('colchao') || lowerName.includes('travesseiro') || lowerName.includes('botijao') ||
      lowerName.includes('cadeira') || lowerName.includes('cama') || lowerName.includes('edredom') ||
      lowerName.includes('lencol') || lowerName.includes('cortina') || lowerName.includes('mesa')
    );

    const hasDomainInstrument = (
      lowerName.includes('violao') || lowerName.includes('guitarra') || lowerName.includes('baixo') ||
      lowerName.includes('contrabaixo') || lowerName.includes('teclado musical') || lowerName.includes('cavaquinho') ||
      lowerName.includes('ukulele') || lowerName.includes('violino') || lowerName.includes('bateria acustica') ||
      lowerName.includes('bateria eletronica') || lowerName.includes('instrumento musical')
    );

    const hasDomainRain = (
      lowerName.includes('chuva') || lowerName.includes('poncho') || lowerName.includes('galao') || (lowerName.includes('impermeavel') && !hasDomainHomeDeco && !hasDomainMoto && !hasDomainCarro)
    );

    // 1. DESAMBIGUAÇÃO: CAPAS / CAPINHAS / CASES / FORROS / PROTETORES
    if (
      lowerName.includes('capa') || lowerName.includes('capas') || lowerName.includes('capinha') ||
      lowerName.includes('capinhas') || lowerName.includes('case') || lowerName.includes('cases') ||
      lowerName.includes('forro') || lowerName.includes('protetor')
    ) {
      if (lowerName.includes('bateria') || lowerName.includes('carregador') || lowerName.includes('carregadora') || lowerName.includes('battery') || lowerName.includes('power bank') || lowerName.includes('powerbank')) {
        // Capa com bateria / Capa Carregadora / Smart Battery Case -> Enquadramento Fiscal: Acumulador de íons de lítio (8507.60.00)
        if (ncm.code === '8507.60.00') score += 400;
        if (ncm.code === '4202.32.00' || ncm.code === '3926.90.90' || ncm.code.startsWith('8517.13')) score -= 500;
      } else if (hasDomainMoto && (lowerName.includes('banco') || lowerName.includes('assento') || lowerName.includes('selim') || lowerName.includes('guidao') || lowerName.includes('carenagem'))) {
        if (ncm.code === '8714.10.00') score += 350;
        if (ncm.code === '3926.90.90' || ncm.code.startsWith('8517.13')) score -= 500;
      } else if (hasDomainCarro && (lowerName.includes('banco') || lowerName.includes('assento') || lowerName.includes('volante') || lowerName.includes('cobrir') || lowerName.includes('carrocaria'))) {
        if (ncm.code === '8708.29.99') score += 350;
        if (ncm.code === '3926.90.90' || ncm.code.startsWith('8517.13')) score -= 500;
      } else if (hasDomainRain || (hasDomainMoto && lowerName.includes('chuva'))) {
        if (ncm.code === '3926.20.00') score += 350;
        if (ncm.code === '3926.90.90' || ncm.code.startsWith('8517.13')) score -= 500;
      } else if (hasDomainHomeDeco) {
        if (lowerName.includes('colchao') || lowerName.includes('travesseiro')) {
          if (ncm.code === '6302.31.00') score += 350;
        } else {
          if (ncm.code === '6304.92.00') score += 350;
        }
        if (ncm.code === '3926.90.90' || ncm.code.startsWith('8517.13')) score -= 500;
      } else if (hasDomainInstrument) {
        if (ncm.code === '4202.92.00') score += 350;
        if (ncm.code === '3926.90.90' || ncm.code.startsWith('8517.13')) score -= 500;
      } else if (lowerName.includes('notebook') || lowerName.includes('laptop') || lowerName.includes('macbook')) {
        if (ncm.code === '4202.12.10') score += 350;
        if (ncm.code === '3926.90.90' || ncm.code.startsWith('8471.30')) score -= 500;
      } else if (hasDomainPhone || lowerName.includes('capinha') || lowerName.includes('case') || lowerName.includes('antichoque')) {
        if (lowerName.includes('couro') || lowerName.includes('carteira')) {
          if (ncm.code === '4202.32.00') score += 350;
        } else {
          if (ncm.code === '3926.90.90') score += 350;
        }
        if (ncm.code.startsWith('8517.13')) score -= 500;
      }
    }

    // 2. DESAMBIGUAÇÃO: ÓLEOS E LUBRIFICANTES
    if (lowerName.includes('oleo') || lowerName.includes('lubrificante') || lowerName.includes('fluido') || lowerName.includes('azeite')) {
      if (lowerName.includes('motor') || hasDomainCarro || hasDomainMoto || lowerName.includes('5w30') || lowerName.includes('10w40') || lowerName.includes('20w50') || lowerName.includes('15w40') || lowerName.includes('sintetico') || lowerName.includes('lubrax') || lowerName.includes('castrol') || lowerName.includes('mobil') || lowerName.includes('motul') || lowerName.includes('yamalube') || lowerName.includes('freio') || lowerName.includes('cambio') || lowerName.includes('transmissao')) {
        if (ncm.code.startsWith('2710.19')) score += 350;
        if (ncm.code.startsWith('1507') || ncm.code.startsWith('1509')) score -= 500;
      } else if (lowerName.includes('soja') || lowerName.includes('girassol') || lowerName.includes('milho') || lowerName.includes('canola') || lowerName.includes('cozinha') || lowerName.includes('fritura') || lowerName.includes('liza') || lowerName.includes('soya')) {
        if (ncm.code.startsWith('1507')) score += 350;
        if (ncm.code.startsWith('2710.19')) score -= 500;
      } else if (lowerName.includes('oliva') || lowerName.includes('azeite') || lowerName.includes('extra virgem') || lowerName.includes('gallo') || lowerName.includes('andorinha')) {
        if (ncm.code.startsWith('1509')) score += 350;
        if (ncm.code.startsWith('2710.19')) score -= 500;
      } else if (lowerName.includes('corporal') || lowerName.includes('amendoas') || lowerName.includes('massagem') || lowerName.includes('capilar') || lowerName.includes('cabelo') || lowerName.includes('facial') || lowerName.includes('essencial')) {
        if (ncm.code.startsWith('3304.99') || ncm.code.startsWith('3301.29')) score += 350;
        if (ncm.code.startsWith('2710.19') || ncm.code.startsWith('1507')) score -= 500;
      }
    }

    // 3. DESAMBIGUAÇÃO: BATERIAS E PILHAS
    if (lowerName.includes('bateria') || lowerName.includes('baterias') || lowerName.includes('pilha') || lowerName.includes('pilhas')) {
      if (hasDomainMoto && (lowerName.includes('5ah') || lowerName.includes('6ah') || lowerName.includes('7ah') || lowerName.includes('4ah') || lowerName.includes('yuasa') || lowerName.includes('route') || lowerName.includes('moto'))) {
        if (ncm.code === '8507.10.90') score += 350;
        if (ncm.code.startsWith('8507.60') || ncm.code.startsWith('8506.10') || ncm.code.startsWith('9206.00')) score -= 500;
      } else if (hasDomainCarro || lowerName.includes('automotiva') || lowerName.includes('60ah') || lowerName.includes('70ah') || lowerName.includes('50ah') || lowerName.includes('45ah') || lowerName.includes('moura') || lowerName.includes('heliar') || lowerName.includes('tudor') || lowerName.includes('cral')) {
        if (ncm.code === '8507.10.10') score += 350;
        if (ncm.code.startsWith('8507.60') || ncm.code.startsWith('8506.10') || ncm.code.startsWith('9206.00')) score -= 500;
      } else if (hasDomainPhone || lowerName.includes('notebook') || lowerName.includes('laptop') || lowerName.includes('power bank') || lowerName.includes('powerbank') || lowerName.includes('li-ion') || lowerName.includes('litio') || lowerName.includes('recarregavel celular')) {
        if (ncm.code === '8507.60.00') score += 350;
        if (ncm.code.startsWith('8507.10') || ncm.code.startsWith('8517.13')) score -= 500;
      } else if (lowerName.includes('pilha') || lowerName.includes('aa') || lowerName.includes('aaa') || lowerName.includes('palito') || lowerName.includes('duracell') || lowerName.includes('rayovac') || lowerName.includes('panasonic')) {
        if (ncm.code === '8506.10.10') score += 350;
        if (ncm.code.startsWith('8507.10')) score -= 500;
      } else if (hasDomainInstrument || lowerName.includes('acustica') || lowerName.includes('eletronica') || lowerName.includes('prato') || lowerName.includes('baqueta') || lowerName.includes('pedal duplo') || lowerName.includes('bumbo')) {
        if (ncm.code === '9206.00.00') score += 350;
        if (ncm.code.startsWith('8507.10') || ncm.code.startsWith('8507.60')) score -= 500;
      }
    }

    // 4. DESAMBIGUAÇÃO: PNEUS E CÂMARAS DE AR
    if (lowerName.includes('pneu') || lowerName.includes('pneus') || lowerName.includes('camara de ar')) {
      if (hasDomainMoto || lowerName.includes('scooter') || lowerName.includes('biz') || lowerName.includes('titan') || lowerName.includes('fan') || lowerName.includes('bros') || lowerName.includes('twister') || lowerName.includes('fazer')) {
        if (lowerName.includes('camara')) {
          if (ncm.code === '4013.90.00') score += 350;
        } else {
          if (ncm.code === '4011.40.00') score += 350;
        }
        if (ncm.code === '4011.10.00' || ncm.code === '4011.50.00') score -= 500;
      } else if (hasDomainCarro || lowerName.includes('aro 13') || lowerName.includes('aro 14') || lowerName.includes('aro 15') || lowerName.includes('aro 16') || lowerName.includes('aro 17') || lowerName.includes('aro 18') || lowerName.includes('goodyear') || lowerName.includes('continental') || lowerName.includes('michelin') || lowerName.includes('bridgestone')) {
        if (ncm.code === '4011.10.00') score += 350;
        if (ncm.code === '4011.40.00' || ncm.code === '4011.50.00') score -= 500;
      } else if (lowerName.includes('bicicleta') || lowerName.includes('bike') || lowerName.includes('ciclismo') || lowerName.includes('aro 20') || lowerName.includes('aro 24') || lowerName.includes('aro 26') || lowerName.includes('aro 29') || lowerName.includes('kenda')) {
        if (lowerName.includes('camara')) {
          if (ncm.code === '4013.20.00') score += 350;
        } else {
          if (ncm.code === '4011.50.00') score += 350;
        }
        if (ncm.code === '4011.10.00' || ncm.code === '4011.40.00') score -= 500;
      }
    }

    // 5. DESAMBIGUAÇÃO: FILTROS
    if (lowerName.includes('filtro') || lowerName.includes('filtros')) {
      if (lowerName.includes('oleo') || lowerName.includes('combustivel') || lowerName.includes('diesel') || lowerName.includes('gasolina') || ((hasDomainCarro || hasDomainMoto) && (lowerName.includes('fram') || lowerName.includes('tecfil') || lowerName.includes('mann') || lowerName.includes('wega') || lowerName.includes('mahle')))) {
        if (ncm.code === '8421.23.00') score += 350;
      } else if (lowerName.includes('filtro de ar') || lowerName.includes('filtro do ar') || lowerName.includes('cabine') || lowerName.includes('admissao') || lowerName.includes('ar condicionado')) {
        if (ncm.code === '8421.31.00') score += 350;
      } else if (lowerName.includes('agua') || lowerName.includes('purificador') || lowerName.includes('bebedouro') || lowerName.includes('torneira') || lowerName.includes('barro') || lowerName.includes('sao joao') || lowerName.includes('stefani')) {
        if (ncm.code === '8421.21.00') score += 350;
      } else if (lowerName.includes('cafe') || lowerName.includes('melitta') || lowerName.includes('coador')) {
        if (ncm.code.startsWith('4823.20')) score += 350;
      } else if (lowerName.includes('solar') || lowerName.includes('fps')) {
        if (ncm.code.startsWith('3304.99')) score += 350;
      }
    }

    // 6. DESAMBIGUAÇÃO: LÂMPADAS E ILUMINAÇÃO
    if (lowerName.includes('lampada') || lowerName.includes('lampadas') || lowerName.includes('farol')) {
      if (lowerName.includes('farol') || lowerName.includes('h4') || lowerName.includes('h7') || lowerName.includes('h1') || lowerName.includes('h11') || ((hasDomainCarro || hasDomainMoto) && !lowerName.includes('casa') && !lowerName.includes('teto'))) {
        if (ncm.code === '8539.21.10') score += 350;
        if (ncm.code.startsWith('8539.52')) score -= 500;
      } else if (lowerName.includes('led') || lowerName.includes('bulbo') || lowerName.includes('e27') || lowerName.includes('tubular') || lowerName.includes('spot') || lowerName.includes('plafon') || lowerName.includes('luminaria')) {
        if (ncm.code === '8539.52.00') score += 350;
        if (ncm.code.startsWith('8539.21')) score -= 500;
      }
    }

    // 7. DESAMBIGUAÇÃO: SUPORTES
    if (lowerName.includes('suporte') || lowerName.includes('suportes')) {
      if (lowerName.includes('tv') || lowerName.includes('televisao') || lowerName.includes('monitor') || lowerName.includes('articulado') || lowerName.includes('parede') || lowerName.includes('teto')) {
        if (ncm.code === '8302.49.00') score += 350;
      } else if (hasDomainPhone || lowerName.includes('veicular') || lowerName.includes('guidao') || lowerName.includes('mesa')) {
        if (ncm.code === '3926.90.90') score += 350;
      } else if (lowerName.includes('motor') || lowerName.includes('coxim')) {
        if (ncm.code === '8708.29.99') score += 350;
      }
    }

    // 8. DESAMBIGUAÇÃO: CHAVES E FERRAMENTAS
    if (lowerName.includes('chave') || lowerName.includes('chaves')) {
      if (lowerName.includes('fenda') || lowerName.includes('philips') || lowerName.includes('torx') || lowerName.includes('allen') || lowerName.includes('estrela') || lowerName.includes('combinada') || lowerName.includes('boca') || lowerName.includes('catraca') || lowerName.includes('jogo de chave')) {
        if (ncm.code.startsWith('8205.40') || ncm.code.startsWith('8204')) score += 350;
      } else if (lowerName.includes('canivete') || lowerName.includes('codificada') || lowerName.includes('fechadura') || lowerName.includes('cadeado')) {
        if (ncm.code.startsWith('8301')) score += 350;
      } else if (lowerName.includes('interruptor') || lowerName.includes('eletrica') || lowerName.includes('gangorra')) {
        if (ncm.code.startsWith('8536.50')) score += 350;
      }
    }

    // 9. DESAMBIGUAÇÃO: CABOS E CONDUTORES
    if (lowerName.includes('cabo') || lowerName.includes('cabos') || lowerName.includes('fio') || lowerName.includes('fios')) {
      if (lowerName.includes('usb') || lowerName.includes('lightning') || lowerName.includes('tipo c') || lowerName.includes('tipo-c') || lowerName.includes('type c') || lowerName.includes('dados') || lowerName.includes('micro usb')) {
        if (ncm.code === '8544.42.00') score += 350;
        if (ncm.code.startsWith('8544.49')) score -= 300;
      } else if (lowerName.includes('flexivel') || lowerName.includes('eletrico') || lowerName.includes('cobre') || lowerName.includes('1.5mm') || lowerName.includes('2.5mm') || lowerName.includes('4mm') || lowerName.includes('6mm') || lowerName.includes('10mm') || lowerName.includes('rede') || lowerName.includes('rj45') || lowerName.includes('sil') || lowerName.includes('corfio')) {
        if (ncm.code === '8544.49.00') score += 350;
        if (ncm.code.startsWith('8544.42')) score -= 300;
      } else if ((hasDomainMoto || hasDomainCarro) && (lowerName.includes('acelerador') || lowerName.includes('freio') || lowerName.includes('embreagem') || lowerName.includes('velocimetro'))) {
        if (hasDomainMoto) {
          if (ncm.code === '8714.10.00') score += 350;
        } else {
          if (ncm.code === '8708.29.99') score += 350;
        }
      }
    }

    // 10. DESAMBIGUAÇÃO: VELAS
    if (lowerName.includes('vela') || lowerName.includes('velas')) {
      if (lowerName.includes('ignicao') || lowerName.includes('motor') || hasDomainCarro || hasDomainMoto || lowerName.includes('ngk') || lowerName.includes('bosch')) {
        if (ncm.code === '8511.10.00') score += 350;
      } else if (lowerName.includes('aromatica') || lowerName.includes('aromatizada') || lowerName.includes('decorativa') || lowerName.includes('parafina') || lowerName.includes('aniversario') || lowerName.includes('cheiro')) {
        if (ncm.code.startsWith('3406.00')) score += 350;
      } else if (lowerName.includes('filtro') || lowerName.includes('barro') || lowerName.includes('stefani') || lowerName.includes('carvao')) {
        if (ncm.code.startsWith('6912.00') || ncm.code.startsWith('8421.21')) score += 350;
      }
    }

    // 11. DESAMBIGUAÇÃO: DISCOS E PASTILHAS DE FREIO
    if (lowerName.includes('pastilha') || lowerName.includes('pastilhas') || lowerName.includes('disco de freio') || lowerName.includes('patim de freio') || lowerName.includes('freio')) {
      if (hasDomainMoto) {
        if (ncm.code === '8714.10.00') score += 350;
      } else if (hasDomainCarro || lowerName.includes('cobreq') || lowerName.includes('fras-le') || lowerName.includes('jurid') || lowerName.includes('fremax')) {
        if (ncm.code === '8708.30.90') score += 350;
      }
    }

    // 12. Telefonia & Informática Geral (Aparelhos Físicos)
    if (!lowerName.includes('capa') && !lowerName.includes('capinha') && !lowerName.includes('case') && !lowerName.includes('pelicula') && !lowerName.includes('carregador') && !lowerName.includes('cabo') && !lowerName.includes('suporte') && !lowerName.includes('tela') && !lowerName.includes('bateria')) {
      if ((lowerName.includes('smartphone') || lowerName.includes('celular') || lowerName.includes('celulares') || lowerName.includes('iphone') || lowerName.includes('samsung galaxy') || lowerName.includes('xiaomi') || lowerName.includes('motorola')) && ncm.code.startsWith('8517.13')) {
        score += 250;
      }
    }

    if ((lowerName.includes('notebook') || lowerName.includes('laptop') || lowerName.includes('macbook')) && !lowerName.includes('mochila') && !lowerName.includes('capa') && !lowerName.includes('fonte') && !lowerName.includes('carregador') && ncm.code.startsWith('8471.30.12')) score += 220;
    if ((lowerName.includes('computador') || lowerName.includes('pc gamer') || lowerName.includes('cpu')) && !lowerName.includes('mouse') && !lowerName.includes('teclado') && ncm.code.startsWith('8471.41')) score += 200;
    if ((lowerName.includes('tablet') || lowerName.includes('ipad')) && !lowerName.includes('capa') && !lowerName.includes('pelicula') && ncm.code.startsWith('8471.30.11')) score += 200;
    if (lowerName.includes('mouse') && !lowerName.includes('mousepad') && ncm.code.startsWith('8471.60.53')) score += 220;
    if (lowerName.includes('mousepad') && ncm.code.startsWith('3926.90.90')) score += 220;
    if (lowerName.includes('teclado') && !hasDomainInstrument && ncm.code.startsWith('8471.60.52')) score += 220;
    if (lowerName.includes('monitor') && ncm.code.startsWith('8528.52')) score += 200;
    if ((lowerName.includes('ssd') || lowerName.includes('hd externo')) && ncm.code.startsWith('8471.70.12')) score += 200;
    if ((lowerName.includes('pendrive') || lowerName.includes('pen drive') || lowerName.includes('microsd') || lowerName.includes('cartao de memoria')) && ncm.code.startsWith('8523.51')) score += 200;

    // 13. Eletrodomésticos e Áudio
    if (lowerName.includes('geladeira') || lowerName.includes('refrigerador') || lowerName.includes('freezer')) {
      if (ncm.code.startsWith('8418.10')) score += 200;
    }
    if (lowerName.includes('maquina de lavar') || lowerName.includes('lavadora') || lowerName.includes('lava e seca')) {
      if (ncm.code.startsWith('8450.11')) score += 200;
    }
    if (lowerName.includes('ar condicionado') || lowerName.includes('ar-condicionado') || lowerName.includes('split') || lowerName.includes('inverter')) {
      if (ncm.code.startsWith('8415.10')) score += 200;
    }
    if (lowerName.includes('ventilador') || lowerName.includes('ventiladores')) {
      if (ncm.code.startsWith('8414.51')) score += 200;
    }
    if (lowerName.includes('microondas') || lowerName.includes('micro-ondas') || lowerName.includes('micro ondas')) {
      if (ncm.code.startsWith('8516.50')) score += 200;
    }
    if (lowerName.includes('airfryer') || lowerName.includes('air fryer') || lowerName.includes('fritadeira') || lowerName.includes('forno eletrico') || lowerName.includes('fogao inducao')) {
      if (ncm.code.startsWith('8516.60')) score += 200;
    }
    if ((lowerName.includes('cafeteira') || lowerName.includes('nespresso') || lowerName.includes('dolce gusto')) && ncm.code.startsWith('8516.71')) score += 200;
    if ((lowerName.includes('liquidificador') || lowerName.includes('batedeira') || lowerName.includes('processador')) && ncm.code.startsWith('8509.40')) score += 200;
    if ((lowerName.includes('ferro de passar') || lowerName.includes('ferro vapor')) && ncm.code.startsWith('8516.40')) score += 200;
    if ((lowerName.includes('secador de cabelo') || lowerName.includes('chapinha') || lowerName.includes('prancha alisadora')) && ncm.code.startsWith('8516.31')) score += 200;
    if ((lowerName.includes('aspirador de po') || lowerName.includes('aspirador vertical') || lowerName.includes('aspirador robo')) && ncm.code.startsWith('8508.11')) score += 200;
    if ((lowerName.includes('chuveiro') || lowerName.includes('ducha eletrica')) && ncm.code.startsWith('8516.10')) score += 200;

    // Áudio, Caixas de Som, Fones e TV
    if (
      lowerName.includes('caixa de som') || lowerName.includes('caixas de som') || lowerName.includes('caixinha') ||
      lowerName.includes('soundbar') || lowerName.includes('alto falante') || lowerName.includes('alto-falante') ||
      lowerName.includes('subwoofer') ||
      (lowerName.includes('som') && (lowerName.includes('bluetooth') || lowerName.includes('portatil') || lowerName.includes('amplificada') || lowerName.includes('torre') || lowerName.includes('jbl') || lowerName.includes('boombox')))
    ) {
      if (ncm.code.startsWith('8518.2')) {
        score += 180;
        if (ncm.code === '8518.22.00') score += 30;
      }
    }
    if (lowerName.includes('fone') || lowerName.includes('headset') || lowerName.includes('headphone') || lowerName.includes('airpod') || lowerName.includes('earphone')) {
      if (ncm.code.startsWith('8518.30')) score += 180;
    }
    if ((lowerName.includes('tv') || lowerName.includes('televisao') || lowerName.includes('smart tv') || lowerName.includes('smarttv')) && !lowerName.includes('suporte') && ncm.code.startsWith('8528.72')) score += 200;
    if ((lowerName.includes('videogame') || lowerName.includes('ps5') || lowerName.includes('playstation') || lowerName.includes('xbox') || lowerName.includes('nintendo')) && ncm.code.startsWith('9504.50')) score += 200;

    // 14. Farmácia, Medicamentos, Suplementos e Higiene
    if ((lowerName.includes('dipirona') || lowerName.includes('paracetamol') || lowerName.includes('ibuprofeno') || lowerName.includes('amoxicilina') || lowerName.includes('omeprazol') || lowerName.includes('dorflex') || lowerName.includes('neosaldina') || lowerName.includes('remedio') || lowerName.includes('medicamento')) && ncm.code.startsWith('3004.90.99')) score += 200;
    if ((lowerName.includes('vitamina') || lowerName.includes('creatina') || lowerName.includes('whey') || lowerName.includes('suplemento') || lowerName.includes('omega 3')) && ncm.code.startsWith('3004.90.69')) score += 200;
    if ((lowerName.includes('fralda') || lowerName.includes('absorvente')) && ncm.code.startsWith('9619.00')) score += 200;
    if ((lowerName.includes('shampoo') || lowerName.includes('xampu')) && ncm.code.startsWith('3305.10')) score += 200;
    if ((lowerName.includes('condicionador') || lowerName.includes('creme de cabelo')) && ncm.code.startsWith('3305.90')) score += 200;
    if ((lowerName.includes('pasta de dente') || lowerName.includes('creme dental') || lowerName.includes('dentifricio')) && ncm.code.startsWith('3306.10')) score += 200;
    if (lowerName.includes('escova de dente') && ncm.code.startsWith('9603.21')) score += 200;
    if (lowerName.includes('desodorante') && ncm.code.startsWith('3307.20')) score += 200;
    if (lowerName.includes('sabonete') && (ncm.code.startsWith('3401.11') || ncm.code.startsWith('3401.20'))) score += 200;
    if ((lowerName.includes('perfume') || lowerName.includes('colonia') || lowerName.includes('body splash')) && ncm.code.startsWith('3303.00')) score += 200;
    if (lowerName.includes('protetor solar') && ncm.code.startsWith('3304.99')) score += 200;
    if ((lowerName.includes('batom') || lowerName.includes('gloss')) && ncm.code.startsWith('3304.10')) score += 200;
    if ((lowerName.includes('esmalte') || lowerName.includes('unha')) && ncm.code.startsWith('3304.30')) score += 200;

    // 15. Alimentos, Grãos, Mercearia e Bebidas
    if (lowerName.includes('arroz') && ncm.code.startsWith('1006')) score += 180;
    if ((lowerName.includes('feijao') || lowerName.includes('feijão')) && ncm.code.startsWith('0713')) score += 180;
    if ((lowerName.includes('acucar') || lowerName.includes('açucar')) && ncm.code.startsWith('1701')) score += 180;
    if (lowerName.includes('cafe') && !lowerName.includes('cafeteira') && ncm.code.startsWith('0901')) score += 180;
    if (lowerName.includes('farinha') && ncm.code.startsWith('1101')) score += 180;
    if (lowerName.includes('macarrao') && ncm.code.startsWith('1902')) score += 180;
    if ((lowerName.includes('biscoito') || lowerName.includes('bolacha')) && ncm.code.startsWith('1905')) score += 180;
    if (lowerName.includes('pao') && ncm.code.startsWith('1905.90')) score += 180;
    if (lowerName.includes('leite') && !lowerName.includes('condensado') && ncm.code.startsWith('0401')) score += 180;
    if (lowerName.includes('queijo') && ncm.code.startsWith('0406')) score += 180;
    if (lowerName.includes('manteiga') && ncm.code.startsWith('0405')) score += 180;
    if ((lowerName.includes('carne') || lowerName.includes('picanha') || lowerName.includes('alcatra')) && ncm.code.startsWith('0201')) score += 180;
    if (lowerName.includes('frango') && ncm.code.startsWith('0207')) score += 180;
    if ((lowerName.includes('linguica') || lowerName.includes('salsicha') || lowerName.includes('embutido')) && ncm.code.startsWith('1601')) score += 180;
    if ((lowerName.includes('refrigerante') || lowerName.includes('coca') || lowerName.includes('pepsi') || lowerName.includes('fanta') || lowerName.includes('guarana')) && ncm.code.startsWith('2202.10')) score += 180;
    if ((lowerName.includes('agua mineral') || lowerName.includes('garrafao')) && ncm.code.startsWith('2201.10')) score += 180;
    if ((lowerName.includes('cerveja') || lowerName.includes('heineken') || lowerName.includes('brahma') || lowerName.includes('skol') || lowerName.includes('amstel')) && ncm.code.startsWith('2203')) score += 180;
    if (lowerName.includes('vinho') && ncm.code.startsWith('2204')) score += 180;
    if ((lowerName.includes('whisky') || lowerName.includes('uisque')) && ncm.code.startsWith('2208.30')) score += 180;
    if ((lowerName.includes('cachaca') || lowerName.includes('pinga')) && ncm.code.startsWith('2208.40')) score += 180;
    if ((lowerName.includes('energetico') || lowerName.includes('red bull') || lowerName.includes('monster')) && ncm.code.startsWith('2202.99')) score += 180;

    // 16. Papelaria e Pet Shop
    if ((lowerName.includes('caderno') || lowerName.includes('agenda')) && ncm.code.startsWith('4820')) score += 180;
    if ((lowerName.includes('sulfite') || lowerName.includes('papel a4')) && ncm.code.startsWith('4802.56')) score += 180;
    if (lowerName.includes('caneta') && ncm.code.startsWith('9608')) score += 180;
    if (lowerName.includes('lapis') && ncm.code.startsWith('9609')) score += 180;
    if (lowerName.includes('borracha') && !lowerName.includes('pneu') && ncm.code.startsWith('4016.92')) score += 180;
    if ((lowerName.includes('racao') || lowerName.includes('pet food') || lowerName.includes('premier') || lowerName.includes('pedigree') || lowerName.includes('whiskas')) && ncm.code.startsWith('2309.10')) score += 200;

    // 17. Construção, Ferragens e Tintas
    if (lowerName.includes('cimento') && ncm.code.startsWith('2523')) score += 200;
    if (lowerName.includes('tinta') && (ncm.code.startsWith('3209') || ncm.code.startsWith('3208'))) score += 200;
    if ((lowerName.includes('porcelanato') || lowerName.includes('piso ceramico') || lowerName.includes('azulejo')) && ncm.code.startsWith('6907')) score += 200;
    if ((lowerName.includes('disjuntor') || lowerName.includes('quadro din')) && ncm.code.startsWith('8536.20')) score += 200;
    if ((lowerName.includes('tomada') || lowerName.includes('interruptor')) && ncm.code.startsWith('8536.50')) score += 200;
    if ((lowerName.includes('furadeira') || lowerName.includes('parafusadeira')) && ncm.code.startsWith('8467.21')) score += 200;
    if ((lowerName.includes('alicate') || lowerName.includes('martelo')) && ncm.code.startsWith('8205')) score += 200;

    // 18. Vestuário e Calçados
    if ((lowerName.includes('camiseta') || lowerName.includes('t-shirt') || lowerName.includes('regata')) && ncm.code.startsWith('6109.10')) score += 180;
    if ((lowerName.includes('calca jeans') || lowerName.includes('calca') || lowerName.includes('bermuda') || lowerName.includes('short')) && (ncm.code.startsWith('6203.42') || ncm.code.startsWith('6204.62'))) score += 180;
    if ((lowerName.includes('vestido') || lowerName.includes('saia')) && ncm.code.startsWith('6204.42')) score += 180;
    if (lowerName.includes('cueca') && ncm.code.startsWith('6107.11')) score += 180;
    if (lowerName.includes('calcinha') && ncm.code.startsWith('6108.21')) score += 180;
    if (lowerName.includes('meia') && ncm.code.startsWith('6115.95')) score += 180;
    if ((lowerName.includes('tenis') || lowerName.includes('sapatilha')) && ncm.code.startsWith('6404.11')) score += 180;
    if ((lowerName.includes('sapato') || lowerName.includes('bota') || lowerName.includes('sapatenis')) && ncm.code.startsWith('6403.59')) score += 180;
    if ((lowerName.includes('chinelo') || lowerName.includes('havaianas') || lowerName.includes('sandalia') || lowerName.includes('rasteirinha')) && ncm.code.startsWith('6402.99')) score += 180;
    if (lowerName.includes('capacete') && ncm.code.startsWith('6506.10')) score += 250;

    // 19. Limpeza Doméstica
    if ((lowerName.includes('detergente') || lowerName.includes('limpol')) && ncm.code.startsWith('3402.20')) score += 200;
    if ((lowerName.includes('sabao em po') || lowerName.includes('sabao liquido') || lowerName.includes('omo') || lowerName.includes('brilhante') || lowerName.includes('tixan')) && ncm.code.startsWith('3402.90')) score += 200;
    if ((lowerName.includes('amaciante') || lowerName.includes('comfort') || lowerName.includes('downy')) && ncm.code.startsWith('3809.91')) score += 200;
    if ((lowerName.includes('agua sanitaria') || lowerName.includes('cloro') || lowerName.includes('alvejante') || lowerName.includes('q-boa')) && ncm.code.startsWith('2828.90')) score += 200;
    if ((lowerName.includes('desinfetante') || lowerName.includes('pinho sol') || lowerName.includes('veja multiuso') || lowerName.includes('lysoform')) && ncm.code.startsWith('3808.94')) score += 200;
    if ((lowerName.includes('palha de aco') || lowerName.includes('bombril') || lowerName.includes('assolan')) && ncm.code.startsWith('3405.40')) score += 200;

    if (score > 0) {
      scoredList.push({ record: ncm, score });
      if (score > highestScore) {
        highestScore = score;
        bestMatch = ncm;
      }
    }
  }

  // Ordena alternativas
  scoredList.sort((a, b) => b.score - a.score);
  const alternatives = scoredList.slice(0, 5).map(s => ({
    code: s.record.code,
    description: s.record.description,
    score: s.score
  }));

  if (bestMatch && highestScore >= 30) {
    const isHigh = highestScore >= 70;
    let finalCest = bestMatch.cest || '';
    let finalCfop = bestMatch.cfop || '5102';

    // Se o NCM não trouxe CEST diretamente, cruza com a tabela do CONVÊNIO ICMS 142/18 CONFAZ (cestSource)
    if (!finalCest && cestSource && cestSource.length > 0) {
      const cleanMatchNcm = bestMatch.code.replace(/\D/g, '');
      
      // 1. Busca exata ou por prefixo do NCM na base de CEST do CONFAZ
      const directCestMatch = cestSource.find(c => {
        const cleanCestNcm = (c.ncm || '').replace(/\D/g, '');
        if (cleanCestNcm.length >= 4) {
          return cleanMatchNcm === cleanCestNcm || cleanMatchNcm.startsWith(cleanCestNcm) || cleanCestNcm.startsWith(cleanMatchNcm);
        }
        return false;
      });

      if (directCestMatch) {
        finalCest = directCestMatch.code;
        finalCfop = '5405'; // Mercadoria sujeita à Substituição Tributária (CONFAZ 142/18)
      } else {
        // 2. Busca por similaridade semântica na descrição do CONVÊNIO 142/18 somente se pertencer ao mesmo capítulo/família fiscal
        const ncmChapter = cleanMatchNcm.slice(0, 2);
        for (const pToken of productTokens) {
          if (pToken.length > 3) {
            const descCestMatch = cestSource.find(c => {
              const cleanCestNcm = (c.ncm || '').replace(/\D/g, '');
              const matchesChapter = cleanCestNcm ? cleanCestNcm.startsWith(ncmChapter) : true;
              if (matchesChapter) {
                const cTokens = cleanTokens(c.description);
                return cTokens.includes(pToken);
              }
              return false;
            });
            if (descCestMatch) {
              finalCest = descCestMatch.code;
              finalCfop = '5405';
              break;
            }
          }
        }
      }
    }

    return {
      ncm: bestMatch.code,
      ncmDescription: bestMatch.description,
      cest: finalCest,
      cfop: finalCfop,
      confidence: isHigh ? 'high' : 'medium',
      source: 'database',
      alternatives
    };
  }

  // Fallback seguro caso não encontre nada específico
  return {
    ncm: '8517.79.00',
    ncmDescription: 'Padrão / Peças, Acessórios ou Mercadorias em Geral',
    cfop: '5102',
    confidence: 'low',
    source: 'default',
    alternatives
  };
};

// ============================================================================
// 5. SINCRONIZADOR EM MASSA DE PRODUTOS CADASTRADOS
// ============================================================================

export interface BatchSyncReport {
  totalProcessed: number;
  updatedCount: number;
  unchangedCount: number;
  details: Array<{ productName: string; oldNcm?: string; newNcm: string; newCfop: string }>;
}

export const syncAllProductsFiscalData = async (
  products: Product[],
  options?: { overwriteExisting?: boolean }
): Promise<{ updatedProducts: Product[]; report: BatchSyncReport }> => {
  const { ncm } = await loadFiscalDatasets();
  const overwrite = options?.overwriteExisting || false;

  let updatedCount = 0;
  let unchangedCount = 0;
  const details: BatchSyncReport['details'] = [];

  const updatedProducts = await Promise.all(
    products.map(async (prod) => {
      const hasValidNcm = prod.ncm && prod.ncm.replace(/\D/g, '').length === 8 && prod.ncm !== '8517.79.00';
      
      // Se já tem NCM válido e não é pra sobrescrever tudo, mantém
      if (hasValidNcm && !overwrite) {
        unchangedCount++;
        return prod;
      }

      const match = await findMatchingFiscalData(prod.name, prod.category, ncm);
      
      if (match.ncm && match.ncm !== prod.ncm) {
        updatedCount++;
        details.push({
          productName: prod.name,
          oldNcm: prod.ncm,
          newNcm: match.ncm,
          newCfop: match.cfop
        });

        return {
          ...prod,
          ncm: match.ncm,
          cest: match.cest || prod.cest || '',
          cfop: match.cfop || prod.cfop || '5102'
        };
      }

      unchangedCount++;
      return prod;
    })
  );

  return {
    updatedProducts,
    report: {
      totalProcessed: products.length,
      updatedCount,
      unchangedCount,
      details
    }
  };
};
