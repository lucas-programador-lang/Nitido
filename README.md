# NÍTIDO — site estático

Guia independente (compatibilidade de celulares + biblioteca de tarefas + calculadora de indicação) para HUB / MINUTE.

## Arquivos
- `index.html` — estrutura da página
- `style.css` — todo o visual (tema escuro premium, responsivo)
- `data.js` — dados de celulares, tarefas e FAQ (gerados a partir do conteúdo enviado)
- `script.js` — busca/filtros, calculadora, FAQ, e as duas cenas 3D (Three.js, via CDN)

Não há build step: é HTML/CSS/JS puro. O three.js é carregado via CDN (cdnjs), então é preciso estar online para a animação 3D aparecer — o resto do site funciona normalmente offline.

## Publicar no GitHub Pages
1. Crie um repositório novo (ex.: `nitido-site`) e suba estes 4 arquivos na raiz.
2. Em **Settings → Pages**, em "Branch" selecione `main` e a pasta `/ (root)`.
3. Salve. O GitHub gera uma URL do tipo `https://SEU-USUARIO.github.io/nitido-site/`.

Comandos, se preferir via terminal:
```bash
git init
git add index.html style.css data.js script.js README.md
git commit -m "site NÍTIDO"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/nitido-site.git
git push -u origin main
```

## Publicar no Cloudflare Pages
1. Em Cloudflare, vá em **Workers & Pages → Create → Pages → Connect to Git** e selecione o mesmo repositório.
2. Framework preset: **None**. Build command: (deixe vazio). Diretório de saída: `/`.
3. Deploy. Você recebe uma URL `https://nitido-site.pages.dev` e pode depois apontar um domínio próprio em **Custom domains**.

Qualquer novo `git push` no `main` atualiza os dois automaticamente.

## Trocar o link de indicação
O link usado em todo o site é `https://ai.hub.xyz/r/HHZ3V5GH`. Para trocar, busque por essa string em `index.html` (aparece 3 vezes) e substitua.
