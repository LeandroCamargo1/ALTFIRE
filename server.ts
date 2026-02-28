// ============================================================
// server.ts - Entry Point do Servidor FPS Multiplayer
//
// Inicializa:
// 1. Express (HTTP para servir o Geckos.io signaling)
// 2. Geckos.io (WebRTC Data Channels - comunicação UDP-like)
// 3. GameLoop do servidor (64Hz tick rate)
// 4. Gerenciador de jogadores
//
// Para iniciar: npm run dev (com tsx watch para hot reload)
// ============================================================

import http from 'http';
import express from 'express';
import { ServerPlayerManager } from './entities/ServerPlayerManager.js';
import { NetworkManager } from './network/NetworkManager.js';
import { GameLoop } from './core/GameLoop.js';
import { SERVER_PORT } from '../shared/constants.js';

// ============================================================
// Inicialização do Servidor
// ============================================================

console.log('============================================');
console.log('  FPS Multiplayer Server - Fase 1');
console.log('============================================');

// Cria app Express (necessário para Geckos.io signaling via HTTP)
const app = express();

// Cria servidor HTTP nativo (Geckos precisa)
const server = http.createServer(app);

// Rota de health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    players: playerManager.getPlayerCount(),
    tick: networkManager.getTick(),
  });
});

// ============================================================
// Módulos do Jogo
// ============================================================

// Gerenciador de jogadores - mantém o estado autoritativo
const playerManager = new ServerPlayerManager();

// Gerenciador de rede - Geckos.io WebRTC
const networkManager = new NetworkManager(server, playerManager);

// Game Loop do servidor - roda a 64Hz
const gameLoop = new GameLoop((deltaTime: number) => {
  // Na Fase 1, o game loop apenas mantém o tick rodando.
  // Na Fase 2, aqui será processada:
  // - Física server-side (Rapier)
  // - Validação de inputs
  // - Detecção de colisão
  // - Server reconciliation
});

// ============================================================
// Iniciar Servidor
// ============================================================

server.listen(SERVER_PORT, () => {
  console.log(`[Server] Rodando na porta ${SERVER_PORT}`);
  console.log(`[Server] Health check: http://localhost:${SERVER_PORT}/health`);
  console.log('============================================');

  // Inicia o listener de conexões
  networkManager.start();

  // Inicia o game loop
  gameLoop.start();
});

// ============================================================
// Graceful Shutdown
// ============================================================

const shutdown = () => {
  console.log('\n[Server] Encerrando...');
  gameLoop.stop();
  networkManager.stop();
  server.close(() => {
    console.log('[Server] Encerrado com sucesso.');
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
