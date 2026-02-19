

# Corrigir contagem de Conversoes por Hora e Dados GEO

## Problema identificado

A API do Meta retorna resultados paginados (padrao de 25 por pagina). O codigo atual le apenas a **primeira pagina** dos resultados, ignorando as demais. Isso causa:

1. **Conversoes por Hora**: Com `time_increment=1` (quebra por dia), um periodo de 2 dias gera ate 48 linhas (24h x 2 dias). Apenas 25 sao lidas, perdendo dados e mostrando totais incorretos (ex: 1 ao inves de 25).
2. **GEO por Cidade/Estado**: O `limit=50` pode nao ser suficiente para cidades. Alem disso, nao ha paginacao para buscar o restante.

## Solucao

### 1. Criar funcao de paginacao generica

Adicionar uma funcao `fetchAllPages` no edge function que segue os cursores `paging.next` da API do Meta ate esgotar todas as paginas.

```text
async function fetchAllPages(url: string): Promise<any[]> {
  const allRows = [];
  let nextUrl = url;
  while (nextUrl) {
    const res = await fetch(nextUrl);
    const data = await res.json();
    if (data.data) allRows.push(...data.data);
    nextUrl = data.paging?.next || null;
  }
  return allRows;
}
```

### 2. Corrigir busca de Conversoes por Hora

- Remover `time_increment=1` da URL para que o Meta agregue os dados do periodo inteiro em vez de dividir por dia
- Usar `fetchAllPages` para garantir que todas as horas sejam capturadas
- Adicionar `limit=100` na URL para reduzir numero de paginas necessarias

### 3. Corrigir busca de dados GEO

- Substituir o fetch simples por `fetchAllPages` para country, region e city
- Aumentar `limit` para `200` para cobrir mais cidades na primeira pagina
- Garantir que todas as paginas sejam lidas para contagem completa

## Arquivo modificado

| Arquivo | Mudanca |
|---------|---------|
| `supabase/functions/fetch-ads-data/index.ts` | Adicionar `fetchAllPages`, aplicar na busca hourly (sem `time_increment=1`) e nas 3 buscas GEO |

## Detalhes tecnicos

### Busca Hourly (antes)
```text
URL: .../insights?fields=actions&date_preset=...&time_increment=1&breakdowns=hourly_stats_aggregated_by_advertiser_time_zone
Problema: time_increment=1 multiplica linhas por dia; sem paginacao
```

### Busca Hourly (depois)
```text
URL: .../insights?fields=actions&date_preset=...&breakdowns=hourly_stats_aggregated_by_advertiser_time_zone&limit=100
Correcao: sem time_increment (agrega periodo), com paginacao
```

### Busca GEO (antes)
```text
URL: .../insights?fields=spend,actions&date_preset=...&breakdowns=city&limit=50
Problema: sem paginacao, limit baixo para cidades
```

### Busca GEO (depois)
```text
URL: .../insights?fields=spend,actions&date_preset=...&breakdowns=city&limit=200
Correcao: com paginacao via fetchAllPages, limit maior
```

