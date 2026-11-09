/* =====================================================================
   PANTEÃO · DECLARAÇÃO PRÉ-EXECUÇÃO (componente reutilizável)
   ---------------------------------------------------------------------
   9 perguntas de risco (exemplos fictícios em PT.MOCK.declarationQuestions).
   O detalhe mostrado depende do risco:
   • 'comum' (ação "Exige você" do dia a dia): resumo condensado —
     classificação + 1–2 linhas de justificativa — e as 9 respostas
     completas sob demanda (expandir).
   • 'critico': leitura completa ABERTA por padrão, sem como recolher; a
     aprovação só libera depois de as 9 respostas passarem pela tela e da
     confirmação explícita.
   Qualquer agente usa o mesmo componente: build(decl) para embutir,
   open(decl) para abrir como modal (Promise<boolean>).
   ===================================================================== */
'use strict';
(function (PT) {
  const el = (t, c, x) => PT.Seals.el(t, c, x);
  const SAMPLES = {
    migra: ['Rodar 3 migrações no banco local de desenvolvimento.', 'Banco local "app_dev" (tabelas usuarios, pedidos).', 'Sim — backup automático antes; desfazer = restaurar o dump.', 'Migração parar no meio e deixar o esquema inconsistente.', 'Só o ambiente local. Nenhum serviço externo.', 'Nenhum custo, nenhuma exposição.', 'Rodar primeiro em cópia do banco (adiciona ~1 min).', 'Escrita no banco local, só durante a migração (~40 s).', 'Ogum roda os testes; Cérbero confere o registro.'],
    deploy: ['Publicar a versão atual da branch principal em produção.', 'Servidor de produção, variáveis de ambiente, banco de produção (leitura).', 'Parcialmente — rollback para a versão anterior leva ~2 min; dados gravados no intervalo não voltam.', 'Site fora do ar para usuários reais durante o rollback.', 'Usuários finais do serviço e quem depende da API.', 'Possível custo de uso do provedor; exposição pública imediata.', 'Publicar antes num ambiente de homologação.', 'Credencial de deploy, válida só para esta execução.', 'Ogum checa a saúde do serviço por 5 min; Cérbero audita a credencial; você confirma.'],
    responder: ['Enviar uma resposta curta em seu nome.', 'Conta de e-mail principal, conversa com 1 remetente.', 'Não — mensagem enviada não volta.', 'Tom errado com alguém importante.', 'O destinatário.', 'Exposição externa: sim (fala em seu nome).', 'Caronte só segurar e lembrar você mais tarde.', 'Envio na conta de e-mail, uma vez.', 'Você lê o rascunho antes; Cérbero registra o envio.'],
    excluir: ['Excluir um arquivo da área de trabalho.', '1 arquivo, 2,3 MB.', 'Sim, por 30 dias, pela lixeira.', 'Perder algo que você ainda queria.', 'Só você.', 'Nenhum.', 'Mover para uma pasta de "talvez apagar".', 'Escrita na área de trabalho, uma vez.', 'Você confirma; Cérbero registra.']
  };
  const CLASS = { migra: 'Ação local, reversível.', deploy: 'Parcialmente irreversível, com exposição externa.', responder: 'Irreversível, com exposição externa (fala em seu nome).', excluir: 'Reversível por 30 dias (lixeira).' };
  function sample(kind) { return (SAMPLES[kind] || SAMPLES.migra).slice(); }

  function build(decl, onDone) {
    const Q = PT.MOCK.declarationQuestions, crit = decl.risk === 'critico', A = decl.answers || sample(decl.kind);
    const root = el('div', 'decl' + (crit ? ' decl--crit' : '')); root.dataset.agent = decl.agent;
    const h = el('div', 'decl__h');
    h.append(el('span', 'decl__eyebrow', 'Declaração pré-execução'), el('h3', 'decl__title', decl.action));
    const meta = el('div', 'decl__meta');
    meta.append(el('span', 'decl__agent', PT.MOCK.agents[decl.agent].name), PT.Seals.threshold(decl.thr || 4), el('span', 'decl__risk', crit ? 'Risco crítico — leitura completa obrigatória' : 'Risco comum'));
    h.appendChild(meta);
    const sum = el('div', 'decl__sum');
    sum.append(el('div', 'decl__class', decl.classification || CLASS[decl.kind] || (crit ? 'Parcialmente irreversível, com exposição externa.' : 'Ação local, reversível.')));
    (decl.justification || [A[2], A[3]]).slice(0, 2).forEach(j => sum.append(el('p', 'decl__just', j)));
    const list = el('ol', 'decl__list');
    Q.forEach((q, i) => { const li = el('li', 'decl__item'); li.dataset.i = i; li.append(el('span', 'decl__q', q), el('span', 'decl__a', A[i] || '—')); list.appendChild(li); });
    const foot = el('div', 'decl__foot'), ok = el('button', 'btn btn--acc', 'Aprovar execução'), no = el('button', 'btn btn--ghost', 'Recusar');
    ok.type = no.type = 'button';
    let wrap;
    if (crit) {
      // aberta por padrão, sem recolher; cada resposta precisa passar pela tela
      wrap = el('div', 'decl__full'); wrap.appendChild(list);
      const read = new Set(), prog = el('span', 'decl__prog', 'lidas: 0/9'), chk = el('label', 'decl__chk'), box = el('input'); box.type = 'checkbox'; box.disabled = true;
      chk.append(box, document.createTextNode(' Li as 9 respostas e entendo o risco'));
      const upd = () => { prog.textContent = `lidas: ${read.size}/9`; box.disabled = read.size < 9; ok.disabled = !(read.size >= 9 && box.checked); };
      const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting && e.intersectionRatio >= 0.98) { read.add(e.target.dataset.i); e.target.classList.add('is-read'); upd(); } }), { root: wrap, threshold: [0.98, 1] });
      list.querySelectorAll('li').forEach(li => io.observe(li));
      box.addEventListener('change', upd); ok.disabled = true;
      foot.append(prog, chk, no, ok);
      root.append(h, sum, wrap, foot);
    } else {
      wrap = el('details', 'decl__more'); const s = el('summary', '', 'Ver as 9 respostas completas'); wrap.append(s, list);
      foot.append(no, ok); root.append(h, sum, wrap, foot);
    }
    ok.onclick = () => onDone && onDone(true); no.onclick = () => onDone && onDone(false);
    return root;
  }

  function open(decl) {
    return new Promise(res => {
      const layer = document.getElementById('modal-layer'), back = el('div', 'modal');
      back.setAttribute('role', 'dialog'); back.setAttribute('aria-modal', 'true');
      const box = build(decl, v => { back.remove(); res(v); });
      back.appendChild(box); layer.appendChild(back);
      const first = box.querySelector('summary, .decl__full, button'); if (first) first.focus && first.focus();
      back.addEventListener('keydown', e => { if (e.key === 'Escape' && decl.risk !== 'critico') { back.remove(); res(false); } });
    });
  }
  PT.Declaration = { build, open, sample };
})(window.PT);
