# STP-SOAP · Sistema de Teste de Performance

Monitor web de performance para WebServices SOAP — substitui o SoapUI/JMeter para testes de carga.

## 📁 Estrutura do Projeto

```
stp-soap/
├── index.html          ← SPA completa (front-end)
├── api/
│   └── proxy.js        ← Função serverless Vercel (proxy SOAP)
├── package.json
├── vercel.json
└── README.md
```

## 🚀 Deploy no Vercel

### 1. Instalar Vercel CLI
```bash
npm install -g vercel
```

### 2. Fazer login
```bash
vercel login
```

### 3. Deploy
```bash
cd stp-soap/
vercel deploy --prod
```

O Vercel vai detectar automaticamente a estrutura e configurar as serverless functions.

### Desenvolvimento local
```bash
vercel dev
# Acesse: http://localhost:3000
```

---

## ⚙️ Configuração de Perfis

Ao acessar o sistema, clique em **+ Novo Perfil** e preencha:

| Campo | Descrição | Exemplo |
|---|---|---|
| **Nome** | Identificação amigável | `Produção HAPVIDA` |
| **Código** | Prefixo do NumAtendimento (2-6 chars) | `HAP` |
| **URL** | URL do WebService SOAP | `https://servidor.com/ws/soap` |
| **Login** | Credencial Basic Auth (opcional) | `usuario` |
| **Senha** | Senha Basic Auth (opcional) | `senha` |
| **SOAPAction** | Header SOAPAction (opcional) | `""` ou vazio |
| **Payload Template** | XML com o placeholder `{{NUM_ATENDIMENTO}}` | Ver abaixo |

### Exemplo de Payload Template
```xml
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" 
                  xmlns:ser="http://service.exemplo.com/">
  <soapenv:Header/>
  <soapenv:Body>
    <ser:ConsultarExame>
      <numAtendimento>{{NUM_ATENDIMENTO}}</numAtendimento>
      <codigoLaboratorio>001</codigoLaboratorio>
    </ser:ConsultarExame>
  </soapenv:Body>
</soapenv:Envelope>
```

---

## 🔢 Fórmula do NumeroAtendimento

```
{CODIGO}{YYYYMMDD}{SEQ:003}
```

Exemplos:
- `PRO20260320001` → 1ª request do endpoint PRO em 20/03/2026
- `HAP20260320005` → 5ª request do endpoint HAP em 20/03/2026

**Garantias:**
- Cada endpoint tem seu contador independente
- Contador persiste por data (localStorage)
- Sem repetição no mesmo dia
- Novo dia = contador reinicia do 001

---

## 📊 Métricas Calculadas

| Métrica | Descrição |
|---|---|
| Min / Max | Menor e maior tempo de resposta |
| Média | Média aritmética |
| P50 (Mediana) | 50% das requests abaixo deste valor |
| P90 / P95 / P99 | Percentis de cauda |
| Desvio Padrão | Dispersão (estabilidade) |
| Taxa de Sucesso | % de requests sem erro SOAP/HTTP |

---

## 🔧 Configurações do Teste

| Parâmetro | Range | Padrão | Descrição |
|---|---|---|---|
| Requests por Endpoint | 1–20 | 10 | Quantidade de requests em cada endpoint |
| Concorrência | 1–10 | 3 | Máximo de requests simultâneas |
| Ramp-up | 0–30s | 0 | Tempo para atingir concorrência máxima |
| Timeout | 5–300s | 120 | Timeout por request |

---

## 📤 Exportação

### XLSX (Excel)
- **Aba Resumo**: Estatísticas agregadas por endpoint
- **Aba Detalhes**: Registro individual de cada request

### CSV
- `STP_Resumo_{timestamp}.csv` — Métricas consolidadas
- `STP_Detalhes_{timestamp}.csv` — Log completo

---

## 🛡️ Arquitetura

```
Browser (index.html)
    │
    │  Pool de concorrência controlada no frontend
    │  Cada request = 1 chamada ao proxy
    │
    ▼
/api/proxy.js (Vercel Serverless)
    │
    │  Forward com Basic Auth + SOAPAction
    │  Detecção de SOAP Fault
    │  Timeout configurável
    │
    ▼
WebService SOAP (Endpoints)
```

**Por que proxy serverless?**
- Evita bloqueio de CORS nos endpoints SOAP
- Cada função tem timeout independente (até 120s)
- Não há risco de timeout global da função
