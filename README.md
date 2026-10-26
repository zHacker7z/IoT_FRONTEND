# Monitoramento Ambiental — frontend

Painel web do projeto acadêmico de monitoramento ambiental. Mostra a temperatura e a umidade do ar coletadas por um Raspberry Pi e
disponibilizadas pela API do projeto, com histórico em gráficos, avisos de dados desatualizados e status da comunicação.

Este repositório contém **apenas o frontend**. O backend (API na VPS) e o programa do Raspberry Pi não fazem parte dele.

## Situação da integração

| Parte | Situação |
| --- | --- |
| Leitura atual (temperatura e umidade) | Pronta. Aguarda a URL da API e o caminho do endpoint (`VITE_API_BASE_URL`, `VITE_API_LATEST_PATH`). |
| Histórico e gráficos | Pronto. Aguarda o caminho do endpoint de histórico (`VITE_API_HISTORY_PATH`). Sem ele, a seção informa que o histórico não está disponível. |
| Previsão do tempo | **Não disponível.** O backend não fornece previsão e nenhuma fonte externa foi definida. A seção explica a ausência e não exibe dados simulados. |
| Status do sistema | Pronto. Mostra se a API respondeu, horário da última consulta e da última medição, e aviso de dados desatualizados. |

Quando o repositório foi analisado, não havia documentação da API, `.env` nem exemplos de resposta. Por isso **nenhum endpoint foi
presumido**: os caminhos são configurados por variável de ambiente e, sem eles, o painel mostra o estado "API não configurada".

### O que falta do backend

1. URL-base da API na VPS.
2. Caminho do endpoint da medição mais recente e, se existir, do histórico.
3. Um exemplo de resposta JSON de cada endpoint (nomes dos campos, unidades e formato da data).
4. Liberação de CORS para a origem do painel (veja abaixo).
5. Se a API exigir autenticação: ela não pode ser feita com segredo no navegador; o backend precisaria oferecer um acesso público de leitura.

## Como executar

Requisitos: Node.js 20.19 ou superior (recomendado: 22 LTS ou mais recente).

```bash
npm install
```

Crie o arquivo de configuração a partir do modelo e preencha os valores reais:

```bash
cp .env.example .env.local
```

Servidor de desenvolvimento (http://localhost:5173):

```bash
npm run dev
```

Build de produção (gera a pasta `dist/`, que pode ser servida por qualquer servidor de arquivos estáticos):

```bash
npm run build
```

Outros comandos: `npm run preview` (serve o build localmente), `npm test` (testes unitários) e `npm run lint`.

> As variáveis `VITE_` são incorporadas no momento do build. Ao mudar a URL da API, gere o build de novo.

## Variáveis de ambiente

| Variável | Obrigatória | Padrão | Descrição |
| --- | --- | --- | --- |
| `VITE_API_BASE_URL` | Sim | — | URL-base da API na VPS, sem barra final. |
| `VITE_API_LATEST_PATH` | Sim* | — | Caminho do endpoint da medição mais recente. |
| `VITE_API_HISTORY_PATH` | Não* | — | Caminho do endpoint com a lista de medições. |
| `VITE_API_TIMEOUT_MS` | Não | `10000` | Tempo limite de cada requisição. |
| `VITE_REFRESH_INTERVAL_SECONDS` | Não | `60` | Atualização automática. Ajuste à frequência de coleta; `0` desativa. |
| `VITE_STALE_AFTER_MINUTES` | Não | `15` | Idade a partir da qual a última medição é considerada desatualizada. |
| `VITE_API_FIELD_TEMPERATURE` | Não | — | Nome do campo de temperatura no JSON (aceita `a.b`). |
| `VITE_API_FIELD_HUMIDITY` | Não | — | Nome do campo de umidade no JSON (aceita `a.b`). |
| `VITE_API_FIELD_TIMESTAMP` | Não | — | Nome do campo com o horário da medição (aceita `a.b`). |

\* É preciso informar pelo menos um dos dois endpoints. Se só o histórico for informado, a leitura atual é o ponto mais recente dele.

Nenhuma dessas variáveis é secreta, e nenhuma deve ser: tudo o que começa com `VITE_` fica visível no navegador.

## Formato de resposta aceito

O contrato da API não estava documentado, então o adaptador (`src/services/normalizers.ts`) reconhece os formatos mais comuns
e **rejeita** o que não reconhece, em vez de mostrar valores inventados:

- **Leitura atual:** um objeto com a medição, uma lista (usa a medição mais recente) ou um objeto que embrulha a medição
  (`{ "data": { ... } }`, `{ "leitura": { ... } }` etc.).
- **Histórico:** uma lista de medições, direta ou embrulhada (`{ "leituras": [ ... ] }`). Itens sem horário válido (ou com horário
  repetido) ficam fora do gráfico e são contados no painel de status.
- **Campos reconhecidos** (sem diferenciar maiúsculas, `_` ou `-`):
  - temperatura: `temperature`, `temperatura`, `temp`, `temperature_c`, `temperatura_c`, `temp_c`, `celsius`;
  - umidade: `humidity`, `umidade`, `umid`, `hum`, `humidity_percent`, `umidade_relativa`, `relative_humidity`, `umidade_ar`, `rh`;
  - horário: `timestamp`, `measured_at`, `recorded_at`, `created_at`, `data_hora`, `data_leitura`, `datetime`, `date_time`, `horario`,
    `date`, `time`, `ts`.
- **Valores:** número ou texto numérico (aceita vírgula decimal e unidade junto, como `"24,5 °C"`).
- **Horário:** ISO 8601, epoch em segundos ou milissegundos, ou `dd/mm/aaaa hh:mm[:ss]`. Datas sem fuso são lidas no fuso do navegador.
- **Unidades presumidas:** temperatura em °C e umidade relativa em %. Leituras fora de −50 a 100 °C ou de 0 a 100% são tratadas como
  inválidas.

Se a API usar outros nomes, defina `VITE_API_FIELD_*` ou acrescente o nome às listas do adaptador.

## CORS e HTTPS

O navegador só permite que o painel leia a API se ela responder com o cabeçalho `Access-Control-Allow-Origin` contendo a origem do
painel (por exemplo `http://localhost:5173` em desenvolvimento e o domínio onde o painel for publicado). O painel envia apenas
requisições `GET` com o cabeçalho `Accept`, que não exigem preflight.

Se o painel for publicado em HTTPS, a API também precisa estar em HTTPS; caso contrário, o navegador bloqueia as requisições
(conteúdo misto). Os dois ajustes são feitos no backend ou no servidor da VPS, não no frontend. Quando a conexão falha, a seção
"Detalhes técnicos" do aviso indica essas causas.

## Previsão do tempo

O backend não oferece dados meteorológicos. Para ativar a seção:

1. Criar um endpoint de previsão no backend;

Serviços que exigem chave privada não devem ser chamados pelo frontend: a chave ficaria exposta.

## O que o painel faz

- **Cabeçalho:** indicador de conexão com a API, horário real da última medição (vindo da API) e botão de atualização manual.
- **Leituras atuais:** temperatura e umidade em destaque, cada uma com uma régua de instrumento, a faixa percorrida nas últimas 24 h
  e a tendência da última hora (quando há histórico). A umidade traz como referência os níveis de alerta da Defesa Civil para ar seco.
- **Histórico:** gráficos de temperatura e umidade com eixos e unidades, mínima, média e máxima do período, seletor de período
  (somente com os períodos que os dados cobrem) e trechos sem medições hachurados — inclusive o atraso até o horário atual.
- **Status do sistema:** conexão, servidor, última consulta, última medição, situação das leituras e atualização automática.
  A disponibilidade da API não é confundida com a do Raspberry Pi: a idade da última medição é o indício de que os sensores continuam
  enviando dados.
- **Estados:** carregamento com skeletons, API não configurada, API sem resposta, erro HTTP, resposta em formato inesperado, tempo
  esgotado, resposta vazia, dados desatualizados e atualização em andamento. Ausência de dado nunca aparece como `0 °C` ou `0%`.
- **Atualização periódica:** configurável, sem requisições sobrepostas, pausada com a aba em segundo plano e cancelada ao sair da página.

## Estrutura

```
src/
├── config/        variáveis de ambiente validadas e faixas de referência das escalas
├── types/         modelo de medição, erros e respostas da API
├── services/      cliente HTTP (tempo limite, erros tipados), adaptador de respostas e consulta do painel
├── hooks/         consulta periódica (store externo + useSyncExternalStore) e relógio
├── utils/         formatação pt-BR, cálculos de histórico, idade dos dados e mensagens de erro
├── components/
│   ├── layout/    cabeçalho, marca e rodapé
│   ├── readings/  leituras atuais e régua de instrumento
│   ├── history/   seção de histórico, gráficos (carregados sob demanda) e seletor de período
│   ├── weather/   seção de previsão do tempo
│   ├── status/    avisos, indicador de conexão e status do sistema
│   └── ui/        painel, skeleton, detalhes recolhíveis e limite de erro por seção
└── pages/         DashboardPage
```

Tecnologias: React 19, Vite, TypeScript, Tailwind CSS 4, Recharts e Lucide. Testes com Vitest; lint com oxlint.
A fonte Archivo é carregada do Google Fonts; sem internet, o painel usa a fonte do sistema.
