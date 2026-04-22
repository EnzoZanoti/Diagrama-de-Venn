import React, { useState, useMemo, useRef } from 'react';
import { UploadCloud, FileText, PieChart, Users, CheckCircle, Info, Download, AlertCircle, PlayCircle, AlignLeft } from 'lucide-react';

// --- CONFIGURAÇÃO E DADOS DE EXEMPLO ---
const MOCK_CSV = `usuário,treinamento,concluído
João Silva,Segurança da Informação,12/04/2026 10:00
Maria Souza,Segurança da Informação,13/04/2026 11:30
Carlos Eduardo,Segurança da Informação,11/04/2026 09:15
João Silva,LGPD Básica,14/04/2026 09:00
Ana Clara,LGPD Básica,14/04/2026 10:20
Maria Souza,LGPD Básica,15/04/2026 14:10
Fernanda Lima,LGPD Básica,12/04/2026 16:40
Pedro Paulo,Lavagem de Dinheiro,
Maria Souza,Lavagem de Dinheiro,10/04/2026 14:00
João Silva,Lavagem de Dinheiro,16/04/2026 08:30
Lucas Mendes,Lavagem de Dinheiro,11/04/2026 11:10
Ana Clara,Segurança da Informação,
Fernanda Lima,Lavagem de Dinheiro,13/04/2026 17:00
Carlos Eduardo,LGPD Básica,17/04/2026 10:00`;

// --- FUNÇÕES UTILITÁRIAS ---
function parseCSV(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l !== '');
  if (lines.length < 2) return [];

  const separator = lines[0].indexOf(';') > -1 ? ';' : ',';
  
  const headers = lines[0].split(separator).map(h => h.trim().toLowerCase());
  let userIdx = headers.findIndex(h => h.includes('usuário') || h.includes('usuario') || h.includes('nome'));
  let trainIdx = headers.findIndex(h => h.includes('treinamento') || h.includes('curso'));
  let compIdx = headers.findIndex(h => h.includes('concluído') || h.includes('concluido') || h.includes('data'));

  // Fallbacks de índice caso os nomes das colunas fujam do padrão
  if (userIdx === -1) userIdx = 0;
  if (trainIdx === -1) trainIdx = 1;
  if (compIdx === -1) compIdx = 2;

  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(separator).map(c => c.trim().replace(/^"|"$/g, ''));
    if (row.length >= 3) {
      data.push({
        user: row[userIdx],
        training: row[trainIdx],
        completed: row[compIdx]
      });
    }
  }
  return data;
}

// --- COMPONENTES DA INTERFACE ---
export default function App() {
  const [rawData, setRawData] = useState([]);
  const [selectedTrainings, setSelectedTrainings] = useState([]);
  const [activeSegment, setActiveSegment] = useState(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  // Processamento principal dos dados
  const { allTrainings, validUsers, userTrainingMap } = useMemo(() => {
    if (rawData.length === 0) return { allTrainings: [], validUsers: [], userTrainingMap: new Map() };

    // Filtrar apenas quem concluiu (coluna "concluídos" não está vazia)
    const completedRecords = rawData.filter(d => d.completed && d.completed !== '');
    
    const uMap = new Map();
    const tSet = new Set();

    completedRecords.forEach(record => {
      if (!uMap.has(record.user)) {
        uMap.set(record.user, new Set());
      }
      uMap.get(record.user).add(record.training);
      tSet.add(record.training);
    });

    return {
      allTrainings: Array.from(tSet),
      validUsers: Array.from(uMap.keys()),
      userTrainingMap: uMap
    };
  }, [rawData]);

  // Pré-selecionar treinamentos iniciais se vazio
  React.useEffect(() => {
    if (allTrainings.length > 0 && selectedTrainings.length === 0) {
      setSelectedTrainings(allTrainings.slice(0, Math.min(3, allTrainings.length)));
    }
  }, [allTrainings, selectedTrainings]);

  // Manipuladores de Eventos
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const parsed = parseCSV(text);
      if (parsed.length === 0) {
        setError('Arquivo vazio ou formato inválido. Verifique se possui colunas separadas por vírgula ou ponto-e-vírgula.');
        return;
      }
      setError('');
      setRawData(parsed);
      setSelectedTrainings([]); // Reset
      setActiveSegment(null);
    };
    reader.readAsText(file);
  };

  const loadMockData = () => {
    setRawData(parseCSV(MOCK_CSV));
    setSelectedTrainings([]);
    setActiveSegment(null);
    setError('');
  };

  const toggleTraining = (training) => {
    setActiveSegment(null); // Resetar detalhe do diagrama
    setSelectedTrainings(prev => {
      if (prev.includes(training)) {
        return prev.filter(t => t !== training);
      } else {
        if (prev.length >= 12) {
          setError('Apenas pode selecionar até 12 treinamentos para a análise de intersecção.');
          setTimeout(() => setError(''), 3000);
          return prev;
        }
        return [...prev, training];
      }
    });
  };

  // Cálculo de Diagrama de Venn
  const vennStats = useMemo(() => {
    if (selectedTrainings.length < 2 || selectedTrainings.length > 3) return null;

    const stats = {
      segments: {},
      labels: selectedTrainings
    };

    validUsers.forEach(user => {
      const userSets = userTrainingMap.get(user);
      
      if (selectedTrainings.length === 2) {
        const [A, B] = selectedTrainings;
        const hasA = userSets.has(A);
        const hasB = userSets.has(B);

        if (hasA && !hasB) { stats.segments['A'] = (stats.segments['A'] || []).concat(user); }
        else if (!hasA && hasB) { stats.segments['B'] = (stats.segments['B'] || []).concat(user); }
        else if (hasA && hasB) { stats.segments['AB'] = (stats.segments['AB'] || []).concat(user); }
      } 
      else if (selectedTrainings.length === 3) {
        const [A, B, C] = selectedTrainings;
        const hasA = userSets.has(A);
        const hasB = userSets.has(B);
        const hasC = userSets.has(C);

        if (hasA && !hasB && !hasC) { stats.segments['A'] = (stats.segments['A'] || []).concat(user); }
        else if (!hasA && hasB && !hasC) { stats.segments['B'] = (stats.segments['B'] || []).concat(user); }
        else if (!hasA && !hasB && hasC) { stats.segments['C'] = (stats.segments['C'] || []).concat(user); }
        else if (hasA && hasB && !hasC) { stats.segments['AB'] = (stats.segments['AB'] || []).concat(user); }
        else if (hasA && !hasB && hasC) { stats.segments['AC'] = (stats.segments['AC'] || []).concat(user); }
        else if (!hasA && hasB && hasC) { stats.segments['BC'] = (stats.segments['BC'] || []).concat(user); }
        else if (hasA && hasB && hasC) { stats.segments['ABC'] = (stats.segments['ABC'] || []).concat(user); }
      }
    });

    return stats;
  }, [selectedTrainings, validUsers, userTrainingMap]);

  // Cálculo Avançado para mais de 3 treinamentos (Lista de Intersecções)
  const advancedIntersections = useMemo(() => {
    if (selectedTrainings.length <= 3) return null;

    const segments = {};
    validUsers.forEach(user => {
      const userSets = userTrainingMap.get(user);
      // Filtra apenas os treinamentos selecionados que o utilizador concluiu
      const userIntersections = selectedTrainings.filter(t => userSets.has(t));
      
      // Se concluiu pelo menos um dos selecionados, entra no grupo exato dessa combinação
      if (userIntersections.length > 0) {
        const key = userIntersections.sort().join('|||');
        if (!segments[key]) {
          segments[key] = {
            id: key,
            labels: userIntersections,
            users: []
          };
        }
        segments[key].users.push(user);
      }
    });

    // Converte para array e ordena pelos grupos com mais utilizadores
    return Object.values(segments).sort((a, b) => b.users.length - a.users.length);
  }, [selectedTrainings, validUsers, userTrainingMap]);

  // Função para renderizar o rótulo do segmento selecionado
  const getSegmentLabel = (segmentId) => {
    if (typeof segmentId === 'string' && segmentId.includes('|||')) {
      return `Exatamente nestes treinamentos: ${segmentId.split('|||').join(', ')}`;
    }
    
    if (!vennStats) return '';
    const { labels } = vennStats;
    if (labels.length === 2) {
      if (segmentId === 'A') return `Apenas em: ${labels[0]}`;
      if (segmentId === 'B') return `Apenas em: ${labels[1]}`;
      if (segmentId === 'AB') return `Em ambos: ${labels[0]} e ${labels[1]}`;
    } else if (labels.length === 3) {
      if (segmentId === 'A') return `Apenas em: ${labels[0]}`;
      if (segmentId === 'B') return `Apenas em: ${labels[1]}`;
      if (segmentId === 'C') return `Apenas em: ${labels[2]}`;
      if (segmentId === 'AB') return `Em: ${labels[0]} e ${labels[1]} (não em ${labels[2]})`;
      if (segmentId === 'AC') return `Em: ${labels[0]} e ${labels[2]} (não em ${labels[1]})`;
      if (segmentId === 'BC') return `Em: ${labels[1]} e ${labels[2]} (não em ${labels[0]})`;
      if (segmentId === 'ABC') return `Em TODOS os 3 treinamentos`;
    }
    return '';
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      {/* Header / Navbar */}
      <nav className="bg-indigo-600 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-3">
              <PieChart className="w-8 h-8 text-indigo-200" />
              <span className="font-bold text-xl tracking-tight">Trainlytics <span className="font-light text-indigo-200 text-sm">Venn SaaS</span></span>
            </div>
            <div className="flex space-x-4">
              <button 
                onClick={loadMockData}
                className="flex items-center space-x-2 bg-indigo-500 hover:bg-indigo-400 px-3 py-2 rounded-md text-sm font-medium transition"
              >
                <PlayCircle className="w-4 h-4" />
                <span>Testar Exemplo</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Error Notification */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md shadow-sm flex items-center space-x-3">
            <AlertCircle className="w-6 h-6 text-red-500" />
            <p className="text-red-700 font-medium">{error}</p>
          </div>
        )}

        {rawData.length === 0 ? (
          /* Empty State / Upload Area */
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
            <div className="flex justify-center mb-6">
              <div className="bg-indigo-50 p-6 rounded-full">
                <UploadCloud className="w-16 h-16 text-indigo-500" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Faça o upload da sua planilha</h2>
            <p className="text-slate-500 max-w-lg mx-auto mb-8">
              Sua planilha deve conter pelo menos três colunas: <b>usuários</b>, <b>nome do treinamento</b> e <b>concluídos</b> (preenchida apenas quando finalizado).
            </p>
            
            <input 
              type="file" 
              accept=".csv" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
            />
            
            <div className="flex justify-center gap-4">
              <button 
                onClick={() => fileInputRef.current.click()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-8 rounded-lg shadow-sm transition flex items-center space-x-2"
              >
                <FileText className="w-5 h-5" />
                <span>Selecionar CSV</span>
              </button>
            </div>
          </div>
        ) : (
          /* Dashboard Dashboard View */
          <div className="space-y-6">
            
            {/* Top Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-center space-x-4">
                <div className="bg-blue-50 p-3 rounded-lg text-blue-600">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Usuários Únicos (Concluíntes)</p>
                  <p className="text-2xl font-bold text-slate-800">{validUsers.length}</p>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-center space-x-4">
                <div className="bg-green-50 p-3 rounded-lg text-green-600">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Treinamentos Realizados</p>
                  <p className="text-2xl font-bold text-slate-800">
                    {rawData.filter(d => d.completed && d.completed.trim() !== '').length}
                  </p>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-center space-x-4">
                <div className="bg-purple-50 p-3 rounded-lg text-purple-600">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Cursos Diferentes</p>
                  <p className="text-2xl font-bold text-slate-800">{allTrainings.length}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Sidebar - Selections */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 lg:col-span-1 h-fit">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-lg text-slate-800">Configurar Diagrama</h3>
                  <button 
                    onClick={() => {setRawData([]); setSelectedTrainings([]); setActiveSegment(null);}}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    Novo Arquivo
                  </button>
                </div>
                <p className="text-sm text-slate-500 mb-4">
                  Selecione até 12 treinamentos abaixo para gerar as intersecções.
                </p>
                
                <div className="flex flex-wrap gap-2 max-h-96 overflow-y-auto pr-2 pb-2">
  {allTrainings.map(t => {
    const isSelected = selectedTrainings.includes(t);
    return (
      <label 
        key={t} 
        className={`flex items-center space-x-2 py-2 px-3 rounded-lg border cursor-pointer transition-colors w-fit
          ${isSelected ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
      >
        <input
                          type="checkbox" 
                          className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                          checked={isSelected}
                          onChange={() => toggleTraining(t)}
                        />
                        <span className={`text-sm ${isSelected ? 'font-medium text-indigo-900' : 'text-slate-700'}`}>
                          {t}
                        </span>
                      </label>
                    )
                  })}
                </div>
              </div>

              {/* Main Content - Venn Diagram */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 lg:col-span-2">
                <h3 className="font-semibold text-lg text-slate-800 mb-6">Análise de Intersecção</h3>
                
                {selectedTrainings.length < 2 ? (
                  <div className="flex flex-col items-center justify-center h-64 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                    <PieChart className="w-12 h-12 text-slate-300 mb-2" />
                    <p className="text-slate-500 text-sm">Selecione pelo menos 2 treinamentos ao lado.</p>
                  </div>
                ) : selectedTrainings.length <= 3 ? (
                  <div className="flex flex-col items-center">
                    {/* SVG Container */}
                    <div className="relative w-full max-w-lg mx-auto">
                      {selectedTrainings.length === 2 && vennStats && (
                        <VennDiagram2 
                          stats={vennStats} 
                          activeSegment={activeSegment} 
                          onSegmentClick={setActiveSegment} 
                        />
                      )}
                      {selectedTrainings.length === 3 && vennStats && (
                        <VennDiagram3 
                          stats={vennStats} 
                          activeSegment={activeSegment} 
                          onSegmentClick={setActiveSegment} 
                        />
                      )}
                    </div>

                    <p className="text-xs text-slate-400 mt-4 text-center">
                      * Dica: Clique nos números dentro do diagrama para ver a lista de utilizadores.
                    </p>
                  </div>
                ) : (
                  <div className="w-full space-y-4">
                    <div className="bg-indigo-50 text-indigo-800 p-4 rounded-lg text-sm flex items-start space-x-3">
                      <AlignLeft className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <p>
                        Para mais de 3 treinamentos, o Diagrama de Venn perde a legibilidade. 
                        Abaixo apresentamos os <b>Grupos de Intersecção Exatos</b> encontrados, ordenados pelo número de utilizadores (do maior para o menor).
                      </p>
                    </div>

                    <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                      {advancedIntersections && advancedIntersections.length > 0 ? (
                        advancedIntersections.map(segment => (
                          <div 
                            key={segment.id}
                            onClick={() => setActiveSegment(segment.id)}
                            className={`p-4 rounded-lg border cursor-pointer transition flex justify-between items-center ${activeSegment === segment.id ? 'bg-indigo-50 border-indigo-400 shadow-sm' : 'bg-slate-50 border-slate-200 hover:border-indigo-300'}`}
                          >
                            <div className="flex flex-wrap gap-2 flex-1">
                              {segment.labels.map(label => (
                                <span key={label} className="bg-white border border-slate-300 text-slate-700 text-xs px-2 py-1 rounded-md shadow-sm">
                                  {label}
                                </span>
                              ))}
                            </div>
                            <div className="ml-4 flex items-center space-x-2 bg-white px-3 py-1.5 rounded-md border border-slate-200">
                               <span className="text-lg font-bold text-indigo-600">{segment.users.length}</span>
                               <Users className="w-4 h-4 text-slate-400" />
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-center text-slate-500 py-8">Nenhum utilizador encontrado com as combinações selecionadas.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* User List Detail Section */}
            {activeSegment && (vennStats || advancedIntersections) && (
              <div className="bg-white rounded-xl shadow-sm border border-indigo-200 p-6 border-t-4 border-t-indigo-500 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="font-bold text-lg text-slate-800 flex items-center space-x-2">
                      <Users className="w-5 h-5 text-indigo-500" />
                      <span>Utilizadores no segmento</span>
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                      {getSegmentLabel(activeSegment)}
                    </p>
                  </div>
                  <div className="bg-indigo-100 text-indigo-800 font-bold px-4 py-2 rounded-lg">
                    Total: {
                      (selectedTrainings.length <= 3 && vennStats?.segments[activeSegment]) 
                        ? vennStats.segments[activeSegment].length 
                        : (advancedIntersections?.find(s => s.id === activeSegment)?.users.length || 0)
                    }
                  </div>
                </div>

                {(() => {
                  const usersToDisplay = (selectedTrainings.length <= 3 && vennStats) 
                    ? (vennStats.segments[activeSegment] || [])
                    : (advancedIntersections?.find(s => s.id === activeSegment)?.users || []);

                  if (usersToDisplay.length === 0) {
                    return <p className="text-slate-500 italic py-4">Nenhum utilizador encontrado nesta intersecção específica.</p>;
                  }

                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mt-4">
                      {usersToDisplay.sort().map((user, idx) => (
                        <div key={idx} className="bg-slate-50 border border-slate-200 rounded-md p-2 text-sm text-slate-700 truncate shadow-sm" title={user}>
                          {user}
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}

          </div>
        )}
      </main>
    </div>
  );
}

// --- SUB-COMPONENTES DE DIAGRAMAS (SVG) ---

function VennDiagram2({ stats, activeSegment, onSegmentClick }) {
  const [A, B] = stats.labels;
  const countA = stats.segments['A']?.length || 0;
  const countB = stats.segments['B']?.length || 0;
  const countAB = stats.segments['AB']?.length || 0;

  // Cores transparentes base
  const colA = "rgba(99, 102, 241, 0.4)"; // Indigo
  const colB = "rgba(236, 72, 153, 0.4)"; // Pink
  const hoverCol = "rgba(0,0,0,0.1)";

  return (
    <svg viewBox="0 0 400 280" className="w-full h-auto drop-shadow-md">
      {/* Círculos e preenchimentos */}
      <circle cx="140" cy="140" r="110" fill={colA} stroke="#4f46e5" strokeWidth="2" />
      <circle cx="260" cy="140" r="110" fill={colB} stroke="#db2777" strokeWidth="2" />

      {/* Áreas clicáveis (Overlay invisível para captura de clique mais limpa ou usar os textos) */}
      <text x="70" y="40" fill="#4f46e5" fontSize="14" fontWeight="bold" textAnchor="middle">{A.substring(0, 20)}{A.length > 20 ? '...' : ''}</text>
      <text x="330" y="40" fill="#db2777" fontSize="14" fontWeight="bold" textAnchor="middle">{B.substring(0, 20)}{B.length > 20 ? '...' : ''}</text>

      {/* Rótulos interativos (Quantidades) */}
      <g 
        onClick={() => onSegmentClick('A')} 
        className="cursor-pointer hover:opacity-80 transition-opacity"
        transform="translate(100, 145)"
      >
        <circle cx="0" cy="-5" r="25" fill={activeSegment === 'A' ? '#4f46e5' : 'white'} opacity={activeSegment === 'A' ? '1' : '0.8'} />
        <text x="0" y="0" textAnchor="middle" fill={activeSegment === 'A' ? 'white' : '#1e293b'} fontSize="18" fontWeight="bold">{countA}</text>
      </g>

      <g 
        onClick={() => onSegmentClick('B')} 
        className="cursor-pointer hover:opacity-80 transition-opacity"
        transform="translate(300, 145)"
      >
        <circle cx="0" cy="-5" r="25" fill={activeSegment === 'B' ? '#db2777' : 'white'} opacity={activeSegment === 'B' ? '1' : '0.8'} />
        <text x="0" y="0" textAnchor="middle" fill={activeSegment === 'B' ? 'white' : '#1e293b'} fontSize="18" fontWeight="bold">{countB}</text>
      </g>

      <g 
        onClick={() => onSegmentClick('AB')} 
        className="cursor-pointer hover:opacity-80 transition-opacity"
        transform="translate(200, 145)"
      >
        <circle cx="0" cy="-5" r="25" fill={activeSegment === 'AB' ? '#1e293b' : 'white'} opacity="0.9" />
        <text x="0" y="0" textAnchor="middle" fill={activeSegment === 'AB' ? 'white' : '#1e293b'} fontSize="20" fontWeight="bold">{countAB}</text>
      </g>
    </svg>
  );
}

function VennDiagram3({ stats, activeSegment, onSegmentClick }) {
  const [A, B, C] = stats.labels;
  
  const cA = stats.segments['A']?.length || 0;
  const cB = stats.segments['B']?.length || 0;
  const cC = stats.segments['C']?.length || 0;
  const cAB = stats.segments['AB']?.length || 0;
  const cAC = stats.segments['AC']?.length || 0;
  const cBC = stats.segments['BC']?.length || 0;
  const cABC = stats.segments['ABC']?.length || 0;

  const colA = "rgba(99, 102, 241, 0.4)"; // Indigo
  const colB = "rgba(236, 72, 153, 0.4)"; // Pink
  const colC = "rgba(16, 185, 129, 0.4)"; // Emerald

  // Helper para desenhar os botões de interação
  const IntButton = ({ id, x, y, val, color }) => (
    <g 
      onClick={() => onSegmentClick(id)} 
      className="cursor-pointer hover:opacity-90 transition-transform hover:scale-110"
      transform={`translate(${x}, ${y})`}
    >
      <circle cx="0" cy="-6" r="18" fill={activeSegment === id ? color : 'white'} opacity={activeSegment === id ? '1' : '0.9'} />
      <text x="0" y="0" textAnchor="middle" fill={activeSegment === id ? 'white' : '#1e293b'} fontSize="14" fontWeight="bold">{val}</text>
    </g>
  );

  return (
    <svg viewBox="0 0 400 360" className="w-full h-auto drop-shadow-md">
      {/* Círculo A (Topo Esquerda) */}
      <circle cx="150" cy="140" r="110" fill={colA} stroke="#4f46e5" strokeWidth="2" />
      {/* Círculo B (Topo Direita) */}
      <circle cx="250" cy="140" r="110" fill={colB} stroke="#db2777" strokeWidth="2" />
      {/* Círculo C (Base Central) */}
      <circle cx="200" cy="226" r="110" fill={colC} stroke="#10b981" strokeWidth="2" />

      {/* Legendas dos Conjuntos */}
      <text x="80" y="20" fill="#4f46e5" fontSize="12" fontWeight="bold" textAnchor="middle">{A.substring(0, 18)}{A.length > 18 ? '...' : ''}</text>
      <text x="320" y="20" fill="#db2777" fontSize="12" fontWeight="bold" textAnchor="middle">{B.substring(0, 18)}{B.length > 18 ? '...' : ''}</text>
      <text x="200" y="355" fill="#10b981" fontSize="12" fontWeight="bold" textAnchor="middle">{C.substring(0, 20)}{C.length > 20 ? '...' : ''}</text>

      {/* Botões/Valores das interseções */}
      {/* Exclusivos */}
      <IntButton id="A" x="100" y="110" val={cA} color="#4f46e5" />
      <IntButton id="B" x="300" y="110" val={cB} color="#db2777" />
      <IntButton id="C" x="200" y="290" val={cC} color="#10b981" />
      
      {/* Interseções duplas */}
      <IntButton id="AB" x="200" y="90" val={cAB} color="#6366f1" />
      <IntButton id="AC" x="130" y="210" val={cAC} color="#059669" />
      <IntButton id="BC" x="270" y="210" val={cBC} color="#be185d" />

      {/* Interseção tripla */}
      <IntButton id="ABC" x="200" y="160" val={cABC} color="#1e293b" />
    </svg>
  );
}
