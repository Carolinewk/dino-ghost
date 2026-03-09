# Dino Fase Fantasma

Jogo em TypeScript + Vite, pronto para publicar no GitHub Pages.

## Rodando localmente

```bash
npm install
npm run dev
```

## Build de produção

```bash
npm run build
```

## Publicando no GitHub Pages

1. Crie um repositório no GitHub.
2. Inicialize o git neste diretório, se ainda não existir:

```bash
git init
git branch -M main
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git
git push -u origin main
```

3. No GitHub, abra `Settings > Pages` e em `Source` selecione `GitHub Actions`.
4. Cada `push` para `main` vai gerar o build e publicar a pasta `dist`.
