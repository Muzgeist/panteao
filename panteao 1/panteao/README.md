# Panteão · protótipo visual (frontend)

A camada visual do Panteão tem cinco partes:

- a composição central da Nyx, que é o próprio casco;
- painéis de HUD para Cérbero, Caronte, Ogum e Morfeu;
- a notificação no canto, com três rotas;
- os selos;
- a Declaração pré-execução e o andaime de cerimônia.

Tudo é **mock**: sem backend, sem integração com o sistema operacional e sem modelo de linguagem.

O `lilith_corpo.html` **não foi tocado**: serve só de referência. O MD5 continua `f56d9b75c0eb7d9df4542baa9730b227`.

## Como abrir

Abra `index.html` direto no navegador (Chrome, Edge ou Firefox recentes, com WebGL2). Não precisa de servidor: os scripts são clássicos e funcionam via `file://`.

- **Ctrl+Espaço** (ou o botão na barra de cima) mostra ou esconde o casco.
- **Ctrl+Shift+C** abre o Cérbero pelo canal próprio.
- **Esc** recolhe o painel mais recente.
- **Simulador** (barra de cima, tracejado âmbar) é ferramenta de desenvolvimento. Fica numa `aside` separada do design real, começa recolhido e dispara eventos fictícios.
- Pelo console: `Panteao.notify({ agent: 'caronte', thr: 4, urgency: 0.9, route: 'auto', title: '…' })`.
- `test/formas.html` mostra as formas lado a lado. Parâmetros: `?m=alerta` para o estado de alerta, `?n=4000` para o número de células. No console, `arrive(0.8)`, `drop()` e `dust()` disparam eventos.

## Layout (correção v2)

- **O casco é a composição da Nyx** (`js/surfaces/nyx.js` → `PT.Composition`). Ela é conteúdo persistente, sem header, título ou botão de fechar. `PT.WM.open('nyx')` só mostra o casco e `PT.WM.close('nyx')` não faz nada.
- **Palco central único.** É **uma** View com **um** Engine e uma `CompositeForm` (`js/core/composite.js`).
  - A Nyx fica no centro, sempre a maior.
  - Um agente está **ativo** quando tem aviso no canto, quando a superfície dele está aberta, quando é o Ogum convocado ou quando é o Cérbero em convergência. A forma de um agente ativo se junta à da Nyx **no mesmo palco**, em escala secundária e ao lado das asas.
  - Se faltar espaço dos lados (por exemplo, com painéis abertos), a câmera recua e a Nyx continua maior.
- **Lista de status dinâmica.** Só existe linha para quem tem algo relevante agora: aviso, superfície aberta, convergência ou achado recente, fila do Caronte, Ogum convocado ou recém-entregue.
  - Fica oculta quando não há nada.
  - Cada linha tem o próprio botão discreto que abre a superfície e mostra os números que antes estavam nos cards do hub.
  - Com o casco aberto, o aviso direto aparece **na linha do agente**, com selo, ação e "dispensar", e o canto some. Com o casco fechado, o canto volta a ser o lugar do aviso.
- **O hub não existe mais.**
  - A Lilith virou um elemento no canto do palco (`js/surfaces/lilith.js`), com status, "Chamá-la ao painel" e "Liberar".
  - As telas transversais estão no menu **Sistema**: Catálogo, Limiares, Saúde, Cerimônia e Declaração.
  - O botão "Hub" saiu dos painéis.
- **Superfícies individuais.** São painéis de HUD encaixados na borda direita, em posição determinística, com cantoneiras finas e "recolher ›" discreto. Não têm cascata, sombra de janela nem X grande. O terceiro painel em diante empilha atrás do segundo.
- **Canal do Cérbero:** sem alteração. Continua na camada `#canal-cerbero`, fora do casco.

## Silhuetas: núcleo + material + silhueta

| Agente | Núcleo / material | Silhueta (nova) | Sinal |
|---|---|---|---|
| Nyx | Esfera cuja casca é a constelação (árvore geradora + arestas extras, linhas `rigid` que nunca se rompem) | **Asas**: abertas (penas arqueadas e membrana) ou **véu**, um casulo em volta do núcleo por onde só passa brilho. **Auréola** girando devagar. **Poeira de estrela** que cai suave | Asas: `available` + engajamento (`processing`, `attention`, `engagedUntil`). Poeira: `dustSeq` (resposta ou repasse entregue) |
| Cérbero | Grade rígida, íris-diafragma, sacada exata | **Três olhos juntos no topo**, o do meio mais alto. **Dois anéis de corrente** em diagonal no olho do meio, que se cruzam num ponto logo abaixo dele sem cobrir pupila nem os outros olhos. **Duas correntes em laço** orbitando a estrutura entre os olhos | Na convergência (`converge`), os laços apertam e se enrolam em volta do alvo até ela acabar |
| Caronte | Esfera de água amorfa, respiração submersa, gota | **Manto/capuz** do mesmo material: figura encapuzada que cobre o núcleo (só brilho pela fenda). **Água guiada**: arcos que entram e saem do núcleo | O manto abre com o mesmo `pending` da respiração. Mensagem (`arrivalSeq`) chega carregada pela corrente; a trivial se dissolve na superfície |
| Ogum | Barras em forja (deriva entorta, golpe endireita) + `OgumMarkForm` | **Coroa de ferramentas** (martelo, tenaz, bigorna) com núcleo de lava e casca de ferro fundido, em órbita lenta e remoldando-se | Vibra no trabalho; a ferramenta da tarefa (`build`→martelo, `migra`→tenaz, `deploy`→bigorna) desce até a forja |
| Morfeu | **Reescrito**: núcleo quase imóvel (brilho e tamanho ∝ log das gravações) | **Névoa** baixa e lenta borrando o contorno; nunca nítida | Gravação (`lastWrite`) clareia a névoa perto do compartimento. Os quatro estratos de disco saíram |

## Verificação da seção 3 (num navegador headless)

- **Composição da Nyx:**
  - Fica em `#casco > .comp`, sem header nem botão de fechar.
  - `PT.Surfaces.nyx` não existe.
  - `PT.WM.open('nyx')` não cria janela e `close('nyx')` não fecha o casco.
- **Vários ativos no mesmo palco:**
  - Cérbero, Caronte e Morfeu entraram juntos.
  - Os arrays de todas as faixas compartilham o mesmo buffer do engine.
  - A área da Nyx (20,9) é muito maior que a de qualquer secundária (≤ 1,5).
- **Lista:** oculta e com 0 linhas quando não há nada; com uma mensagem na fila, ganha a linha do Caronte com botão.
- **Hub:** `PT.Surfaces.hub` não existe; os 5 itens transversais estão no menu Sistema; a Lilith está na composição com os dois botões; os painéis só têm "recolher".
- **Silhuetas:**
  - Nyx: 666 penas, 504 de membrana, 210 de auréola.
  - Cérbero: 116 no anel do olho, 366 nos laços; pupilas em (−0,43; 0,45), (0; 0,55), (0,43; 0,45), acima do topo da grade (0,27).
  - Caronte: 960 de manto, 390 de água guiada.
  - Ogum: coroa de 676 células com 6 ferramentas.
  - Morfeu: só dois tipos de célula, núcleo e névoa.
- **Regressões:**
  - Cérbero continua funcionando com o casco fechado e a Nyx indisponível.
  - "Via Nyx" com a Nyx fora cai para "direto".
  - As três rotas funcionam.
  - O fluxo do Ogum passa pela Declaração.
  - A cerimônia exige motivo para reprovar.
  - O MD5 da Lilith confere.

## Estrutura

```
index.html                 casco + área de trabalho simulada + canto + simulador
css/panteao.css
js/core/util.js · engine.js · renderer.js · stage.js
js/core/composite.js       CompositeForm: várias formas num mesmo engine (faixas de slots)
js/forms/nyx.js · cerbero.js · caronte.js · ogum.js · morfeu.js
js/system/mock.js · agents.js · notify.js     (notify: rotas + canto + activeAgents)
js/ui/seals.js · declaration.js · ceremony.js · windows.js (casco + trilho de painéis)
js/surfaces/common.js · lilith.js · nyx.js (composição) · agents.js · transversal.js
js/main.js
```

### Como a CompositeForm funciona

- Cada agente recebe uma faixa contígua de slots. A forma dele roda sobre um *proxy* de engine cujos arrays são `subarray` da faixa, com memória compartilhada. As formas não mudaram de contrato.
- A forma escreve em coordenadas locais. A composta escala e posiciona a faixa pelo centro visual da forma, e o tamanho de célula segue a mesma regra do motor (∝ escala^0,72).
- **Entrar:** as células da faixa saem do reservatório (que fica perto da Nyx) e se especializam em ordem de construção.
- **Sair:** elas voltam a ser tronco em ordem inversa, e células tronco invisíveis não custam nada.
- **Trocar de forma dentro da faixa** (Ogum ausente ↔ presente) é reconstrução no lugar: as mesmas células migram direto para o novo papel.

## Pontos de integração futura (marcados no código)

Procure por `INTEGRAÇÃO FUTURA` e `PT.Integration`:

- `PT.Integration.llm.<agente>`: onde hoje aparece o marcador de resposta. Nenhuma fala foi escrita de antemão.
- `tick()` em `js/system/agents.js`: troca a vida sorteada por fontes reais.
- `PT.Agents.lilithSummon()`: ponte com o processo da Lilith.
- `js/ui/windows.js`: painéis viram janelas nativas, e o Cérbero vira processo e IPC próprios.
- `js/ui/ceremony.js`: o `render` de cada estágio.

## Limitações

- **Avatares humanoides simples:** continuam fora desta fase.
- **Cerimônia:** os nomes dos estágios são provisórios (`PT.Ceremony.PRESETS`).
- **Partículas do Caronte no palco:** as partículas de ambiente dele ficam espalhadas em volta quando ele aparece no palco central (efeito pequeno).
- **Fontes:** vêm do Google Fonts; sem rede, o navegador usa as de fallback.
