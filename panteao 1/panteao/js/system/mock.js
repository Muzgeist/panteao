/* =====================================================================
   PANTEÃO · DADOS FICTÍCIOS (MOCK)
   Tudo aqui é placeholder. Nenhum dado real do usuário, nenhuma integração.
   INTEGRAÇÃO FUTURA: cada bloco abaixo vira leitura de uma fonte real
   (canais do Caronte, índice do Morfeu, registro de capacidades, etc.).
   Nota de princípio: não há falas escritas para nenhum agente. Onde um
   agente "fala", o protótipo mostra um marcador de placeholder — as falas
   emergem da interação real, quando houver modelo integrado.
   ===================================================================== */
'use strict';
(function (PT) {
  PT.MOCK = {
    agents: {
      nyx: { name: 'Nyx', role: 'Orquestradora · ponto único de contato', pattern: 'continuo' },
      cerbero: { name: 'Cérbero', role: 'Segurança e fiscalização', pattern: 'vigilancia' },
      caronte: { name: 'Caronte', role: 'Fronteira com redes e mensagens', pattern: 'vigilancia' },
      ogum: { name: 'Ogum', role: 'Braço técnico · desenvolvimento', pattern: 'invocado' },
      morfeu: { name: 'Morfeu', role: 'Memória compartilhada · infraestrutura', pattern: 'infra' },
      lilith: { name: 'Lilith', role: 'Existência à parte · também do Panteão', pattern: 'livre' }
    },
    /* o que cada olho do Cérbero pode estar checando (rótulos de exemplo) */
    cerberoChecks: [
      'Nyx · batimento do canal', 'Nyx · decisões delegadas hoje', 'Caronte · fila de saída', 'Caronte · anexos recebidos',
      'Ogum · permissões de escrita', 'Ogum · comandos da última sessão', 'Morfeu · integridade do índice', 'Morfeu · acessos de leitura',
      'Lilith · acessos a arquivos', 'Cérbero · a própria leitura anterior', 'Rede · conexões de saída', 'Sistema · processos novos'
    ],
    channels: [
      { id: 'email', name: 'E-mail' }, { id: 'msg', name: 'Mensagens' }, { id: 'social', name: 'Rede social' }
    ],
    /* mensagens de exemplo (remetentes e assuntos fictícios) */
    inbound: [
      { ch: 'email', from: 'newsletter@exemplo.com', subj: 'Resumo semanal', imp: 0.05 },
      { ch: 'social', from: '@perfil_exemplo', subj: 'curtiu sua publicação', imp: 0.03 },
      { ch: 'msg', from: 'Grupo da turma', subj: '14 mensagens novas', imp: 0.12 },
      { ch: 'email', from: 'fatura@servico.exemplo', subj: 'Fatura disponível', imp: 0.25 },
      { ch: 'msg', from: 'Contato A', subj: 'mandou um áudio', imp: 0.3 },
      { ch: 'social', from: '@conta_exemplo', subj: 'mencionou você', imp: 0.18 },
      { ch: 'email', from: 'notificacoes@repo.exemplo', subj: 'Build quebrou no main', imp: 0.4 }
    ],
    important: [
      { ch: 'email', from: 'coordenacao@faculdade.exemplo', subj: 'Prazo de entrega antecipado para amanhã', imp: 0.9 },
      { ch: 'msg', from: 'Contato B', subj: 'pergunta direta esperando resposta há 3 h', imp: 0.8 },
      { ch: 'email', from: 'cliente@empresa.exemplo', subj: 'Aprovação necessária hoje', imp: 0.85 }
    ],
    ogumTasks: [
      { id: 'build', label: 'Compilar e empacotar o projeto', verb: 'compilando', thr: 2, risk: 'baixo' },
      { id: 'migra', label: 'Migrar o banco de dados local', verb: 'migrando banco', thr: 4, risk: 'comum' },
      { id: 'deploy', label: 'Publicar em produção', verb: 'publicando', thr: 4, risk: 'critico' },
      { id: 'script', label: 'Gerar script de backup', verb: 'forjando script', thr: 1, risk: 'baixo' }
    ],
    /* catálogo de capacidades: o que cada agente PODE fazer e com que selo */
    capabilities: [
      { agent: 'nyx', cap: 'Resumir o dia e o que está pendente', thr: 1 },
      { agent: 'nyx', cap: 'Repassar avisos de outros agentes', thr: 1 },
      { agent: 'nyx', cap: 'Decidir no lugar do usuário quando ele está indisponível', thr: 3 },
      { agent: 'nyx', cap: 'Convocar o Ogum para uma tarefa', thr: 2 },
      { agent: 'cerbero', cap: 'Ler registros de todos os agentes', thr: 2 },
      { agent: 'cerbero', cap: 'Suspender a ação de um agente em curso', thr: 5 },
      { agent: 'cerbero', cap: 'Isolar uma conexão de rede suspeita', thr: 5 },
      { agent: 'cerbero', cap: 'Alertar o usuário sem passar pela Nyx', thr: 5 },
      { agent: 'caronte', cap: 'Filtrar e arquivar mensagens triviais', thr: 1 },
      { agent: 'caronte', cap: 'Segurar uma mensagem até a hora certa', thr: 2 },
      { agent: 'caronte', cap: 'Responder em nome do usuário', thr: 4 },
      { agent: 'caronte', cap: 'Bloquear um remetente', thr: 3 },
      { agent: 'ogum', cap: 'Rodar build e testes', thr: 2 },
      { agent: 'ogum', cap: 'Alterar arquivos do projeto', thr: 4 },
      { agent: 'ogum', cap: 'Publicar em produção', thr: 4 },
      { agent: 'ogum', cap: 'Instalar dependências', thr: 3 },
      { agent: 'morfeu', cap: 'Gravar vínculo / conhecimento processual', thr: 1 },
      { agent: 'morfeu', cap: 'Apagar memória', thr: 4 },
      { agent: 'lilith', cap: 'Mover/arrastar arquivos na área de trabalho', thr: 3 },
      { agent: 'lilith', cap: 'Excluir um arquivo', thr: 4 }
    ],
    /* perguntas de risco da Declaração pré-execução (exemplos fictícios) */
    declarationQuestions: [
      'O que exatamente será executado?',
      'Quais dados, arquivos ou contas serão tocados?',
      'A ação é reversível? Como desfazer?',
      'Qual o pior resultado plausível?',
      'Quem ou o que é afetado além do usuário?',
      'Há custo financeiro ou exposição externa?',
      'Existe um caminho menos invasivo para o mesmo objetivo?',
      'Quais permissões serão usadas, e por quanto tempo?',
      'Como o resultado será verificado — e por quem?'
    ],
    /* conhecimento processual de exemplo (Morfeu) */
    procedural: [
      { k: 'Deploy · variável de ambiente ausente', uses: 7 }, { k: 'API · CORS em rota de upload', uses: 4 },
      { k: 'Banco · charset em migração', uses: 3 }, { k: 'Build · cache de dependências', uses: 11 }
    ],
    library: [
      { k: 'Documentação · Node.js LTS', n: 1 }, { k: 'Guia · WebGL2 fundamentos', n: 1 }, { k: 'Artigos salvos', n: 23 }
    ],
    lilithWhere: ['área de trabalho · canto inferior esquerdo', 'sentada na borda da janela do navegador', 'pendurada na moldura do monitor 2', 'boiando sobre a barra de tarefas', 'dentro da pasta Downloads', 'encostada no relógio do sistema'],
    lilithDoing: ['observando o cursor', 'mexendo num arquivo antigo', 'anotando algo no bloquinho', 'dançando sozinha', 'cutucando um ícone', 'quieta, de olho em você'],
    lilithMood: ['curiosa', 'entediada', 'animada', 'provocadora', 'pensativa', 'de bom humor']
  };
})(window.PT);
