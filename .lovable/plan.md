

## Arredondar bordas do topbar

Trocar `rounded-none` por `rounded-lg` na div do topbar (linha 51 de `src/pages/Index.tsx`), e remover o negative margin para que o card não fique colado nas bordas — assim fica consistente com os cards abaixo.

### Alteração

**`src/pages/Index.tsx` — linha 51**

Substituir:
```
className="topbar -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-5 mb-8 rounded-none border-b"
```

Por:
```
className="topbar px-4 sm:px-6 lg:px-8 py-5 mb-8 rounded-lg border"
```

- `rounded-none` → `rounded-lg` (bordas arredondadas como os cards)
- Remove negative margins (`-mx-*`) que faziam o topbar encostar nas laterais
- `border-b` → `border` (borda completa ao redor, consistente com o arredondamento)

### Arquivo
- `src/pages/Index.tsx`

