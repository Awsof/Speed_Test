# STP-SOAP · Sistema de Teste de Performance

Monitor web de performance para WebServices SOAP.

## Uso

**Opção 1 — Abrir direto no navegador**
Dê duplo clique no `index.html`. Funciona offline, sem instalação.

> Se o browser bloquear por CORS via `file://`, use a Opção 2.

**Opção 2 — Servidor local**
```bash
python -m http.server 8080
# Acesse: http://localhost:8080
```

**Opção 3 — GitHub Pages (grátis)**
Settings → Pages → Branch: main → Save

## Configuração de Perfis

| Campo | Descrição | Exemplo |
|---|---|---|
| Nome | Identificação amigável | `Produção HAPVIDA` |
| Código | Prefixo do NumAtendimento (2-6 chars) | `HAP` |
| URL | URL do WebService SOAP | `https://servidor.com/ws` |
| Login / Senha | Basic Auth (opcional) | |
| SOAPAction | Header opcional | `""` |
| Payload Template | XML com `{{NUM_ATENDIMENTO}}` | Ver abaixo |

### Exemplo de Payload
```xml
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Body>
    <ConsultarExame>
      <numAtendimento>{{NUM_ATENDIMENTO}}</numAtendimento>
    </ConsultarExame>
  </soapenv:Body>
</soapenv:Envelope>
```

## Fórmula do NumeroAtendimento

```
{CODIGO}{YYYYMMDD}{SEQ:003}
→ PRO20260320001, HAP20260320001 ...
```

Contador independente por endpoint, persiste por data no localStorage.
