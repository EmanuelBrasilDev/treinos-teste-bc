# Treinos Teste BC

Protótipo mobile-first dos minigames de treinamento do RPG de Black Clover.

Tecnologias principais: React, TypeScript, Vite, Tailwind CSS, Motion e Zustand.

## Instalar

```sh
npm install
```

## Executar

```sh
npm run dev -- --host 0.0.0.0
```

## Validar

```sh
npm run build
npm run lint
```

## Treinos implementados

- Ímpeto — Quebra de Alvos
- Reflexo — Esquiva Relâmpago
- Vigor — Resistência Extrema

## Deploy no Vercel

Importe `EmanuelBrasilDev/treinos-teste-bc`, selecione a branch `main` para produção e mantenha a raiz do projeto no diretório do repositório. O `vercel.json` define Vite, instalação com `npm ci`, build com `npm run build` e saída em `dist`. O `package.json` seleciona Node.js 24.

Não são necessárias variáveis de ambiente. Os assets em `public/` são publicados automaticamente. Após conectar o repositório no Vercel, novos pushes geram deployments pela integração com GitHub.
