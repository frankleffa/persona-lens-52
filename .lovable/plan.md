

## Plano: Upload de Criativos (Imagens/Vídeos) no Kanban

### Contexto
Atualmente, a seção "Criativos" no drawer do Kanban só aceita links externos. O gestor precisa fazer upload direto de imagens e vídeos para ter os arquivos prontos para subir nos anúncios.

### Implementação

**1. Criar bucket de storage `campaign-creatives` (migração SQL)**
- Bucket público para que as URLs sejam acessíveis diretamente
- RLS: managers podem fazer upload/delete via `client_manager_links`; leitura pública

```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('campaign-creatives', 'campaign-creatives', true);

CREATE POLICY "Managers can upload creatives" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'campaign-creatives' AND auth.uid() IS NOT NULL);

CREATE POLICY "Managers can delete creatives" ON storage.objects FOR DELETE
  USING (bucket_id = 'campaign-creatives' AND auth.uid() IS NOT NULL);

CREATE POLICY "Public read creatives" ON storage.objects FOR SELECT
  USING (bucket_id = 'campaign-creatives');
```

**2. Atualizar `CampaignDrawer.tsx` — seção de Criativos**
- Quando tipo = "upload": mostrar botão de upload com `<input type="file" accept="image/*,video/*">`
- Fazer upload para `campaign-creatives/{campaignId}/{timestamp}_{filename}`
- Gerar URL pública via `supabase.storage.from('campaign-creatives').getPublicUrl()`
- Salvar o creative com `type: "upload"` e `url` apontando para o storage
- Mostrar preview: thumbnail para imagens, ícone de vídeo com play para vídeos
- Indicador de progresso durante upload
- Ao deletar creative do tipo upload, também remover o arquivo do storage

**3. Melhorar visualização dos criativos na lista**
- Imagens: mostrar thumbnail 48x48 com aspect-ratio preservado
- Vídeos: mostrar ícone de vídeo com badge indicando formato
- Botão de download/abrir em nova aba para cada criativo

### Arquivos alterados
- **Migração SQL** — criar bucket + policies
- `src/components/CampaignDrawer.tsx` — lógica de upload, preview, delete do storage

