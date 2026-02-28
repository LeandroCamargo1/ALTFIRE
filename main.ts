// ============================================================
// main.ts - Entry Point do Cliente FPS Multiplayer
//
// Orquestra todos os módulos do cliente:
// 1. Renderer (Three.js) - Renderização
// 2. InputManager - Captura de teclado/mouse
// 3. NetworkClient (Geckos.io) - Comunicação com servidor
// 4. PlayerEntity - Representação visual dos jogadores
//
// SEPARAÇÃO DE LOOPS:
// - Render Loop: requestAnimationFrame (~60fps+)
//   → Renderiza frames, interpola posições, atualiza câmera
// - Network Loop: Callbacks de evento do Geckos.io (~20Hz)
//   → Recebe snapshots, processa estados, envia inputs
// ============================================================

import * as THREE from 'three';
import { Renderer } from './core/Renderer';
import { InputManager } from './core/InputManager';
import { NetworkClient } from './network/NetworkClient';
import { PlayerEntity } from './entities/PlayerEntity';
import { PlayerState, GameSnapshot } from '@shared/types';
import { PLAYER_HEIGHT } from '@shared/constants';

// ============================================================
// Estado Global do Cliente
// ============================================================

/** Instância do renderer (Three.js) */
let renderer: Renderer;

/** Instância do gerenciador de input */
let inputManager: InputManager;

/** Instância do cliente de rede */
let networkClient: NetworkClient;

/** Mapa de jogadores renderizados (ID -> PlayerEntity) */
const players: Map<string, PlayerEntity> = new Map();

/** Contador para atribuir cores únicas aos jogadores */
let colorCounter = 1;

/** Elemento de status de conexão no HTML */
const statusElement = document.getElementById('connection-status')!;
const crosshairElement = document.getElementById('crosshair')!;

// ============================================================
// Inicialização
// ============================================================

async function init(): Promise<void> {
  console.log('============================================');
  console.log('  FPS Multiplayer Client - Fase 1');
  console.log('============================================');

  // ============================
  // 1. Inicializa o Renderer (Three.js)
  // ============================
  statusElement.textContent = 'Inicializando gráficos...';
  renderer = new Renderer('game-container');
  renderer.setupBaseScene();

  // ============================
  // 2. Inicializa o InputManager
  // ============================
  inputManager = new InputManager(renderer.renderer.domElement);

  // ============================
  // 3. Inicializa e conecta à rede (Geckos.io)
  // ============================
  statusElement.textContent = 'Conectando ao servidor...';
  networkClient = new NetworkClient();

  // Registra callbacks de rede ANTES de conectar
  networkClient.registerCallbacks({
    onConnected: handleConnected,
    onPlayerJoined: handlePlayerJoined,
    onPlayerLeft: handlePlayerLeft,
    onGameState: handleGameState,
    onDisconnected: handleDisconnected,
  });

  try {
    await networkClient.connect();
    statusElement.textContent = 'Conectado! Clique para jogar.';

    // Fade out do status após 2 segundos
    setTimeout(() => {
      statusElement.style.transition = 'opacity 0.5s';
      statusElement.style.opacity = '0';
      setTimeout(() => {
        statusElement.style.display = 'none';
      }, 500);
    }, 2000);

  } catch (error) {
    console.error('[Main] Falha ao conectar:', error);
    statusElement.textContent = 'Erro ao conectar! Verifique se o servidor está rodando.';
    statusElement.style.color = '#ff4444';
    return;
  }

  // ============================
  // 4. Inicia o Render Loop
  // ============================
  renderer.onRender(gameLoop);
  renderer.startRenderLoop();

  console.log('[Main] Cliente inicializado com sucesso!');
}

// ============================================================
// Game Loop (roda a cada frame de renderização)
// ============================================================

function gameLoop(deltaTime: number): void {
  // Poll input do jogador
  const input = inputManager.pollInput();

  // Atualiza câmera com base na rotação do mouse
  updateCamera();

  // Atualiza mira baseada no pointer lock
  crosshairElement.style.display = inputManager.isLocked ? 'block' : 'none';

  // Envia input para o servidor (separado da renderização)
  if (networkClient.connected && inputManager.isLocked) {
    networkClient.sendInput({
      keys: {
        forward: input.forward,
        backward: input.backward,
        left: input.left,
        right: input.right,
        jump: input.jump,
        crouch: input.crouch,
        sprint: input.sprint,
      },
      rotation: {
        yaw: inputManager.yaw,
        pitch: inputManager.pitch,
      },
      deltaTime,
    });
  }

  // Atualiza interpolação de todos os jogadores remotos
  players.forEach((player) => {
    player.update(deltaTime);
  });

  // Atualiza HUD (FPS counter no título)
  document.title = `FPS MP | ${renderer.currentFPS} FPS | ${players.size} jogadores`;
}

// ============================================================
// Atualização da Câmera (Primeira Pessoa)
// ============================================================

function updateCamera(): void {
  // Cria um quaternion a partir do yaw e pitch
  const euler = new THREE.Euler(inputManager.pitch, inputManager.yaw, 0, 'YXZ');
  renderer.camera.quaternion.setFromEuler(euler);

  // Na Fase 1, a câmera fica parada no spawn
  // Na Fase 2, ela seguirá a posição do jogador local
  const localPlayer = networkClient.localPlayerId
    ? players.get(networkClient.localPlayerId)
    : null;

  if (localPlayer) {
    // Câmera na posição do jogador local (altura dos olhos)
    renderer.camera.position.set(
      localPlayer.mesh.position.x,
      localPlayer.mesh.position.y + PLAYER_HEIGHT * 0.85,
      localPlayer.mesh.position.z,
    );
  }
}

// ============================================================
// Handlers de Eventos de Rede
// ============================================================

/**
 * Chamado quando o cliente se conecta e recebe o Welcome.
 * Cria o jogador local e todos os jogadores já na sala.
 */
function handleConnected(localId: string, existingPlayers: PlayerState[]): void {
  console.log(`[Main] Conectado como ${localId}. ${existingPlayers.length} jogadores na sala.`);

  // Cria entidades para todos os jogadores existentes (incluindo o local)
  existingPlayers.forEach((state) => {
    const isLocal = state.id === localId;
    const entity = new PlayerEntity(
      state,
      renderer.scene,
      isLocal,
      isLocal ? 0 : colorCounter++,
    );
    players.set(state.id, entity);
  });
}

/**
 * Chamado quando um novo jogador entra na sala.
 */
function handlePlayerJoined(player: PlayerState): void {
  console.log(`[Main] Novo jogador: ${player.name}`);

  // Evita duplicatas
  if (players.has(player.id)) return;

  const entity = new PlayerEntity(
    player,
    renderer.scene,
    false, // Nunca é local
    colorCounter++,
  );
  players.set(player.id, entity);
}

/**
 * Chamado quando um jogador sai da sala.
 */
function handlePlayerLeft(playerId: string): void {
  console.log(`[Main] Jogador saiu: ${playerId}`);

  const entity = players.get(playerId);
  if (entity) {
    entity.destroy(renderer.scene);
    players.delete(playerId);
  }
}

/**
 * Chamado quando recebe um snapshot do estado do jogo.
 * Este é o LOOP DE REDE - roda a ~20Hz, independente do render.
 */
function handleGameState(snapshot: GameSnapshot): void {
  // Atualiza o estado alvo de cada jogador para interpolação
  snapshot.players.forEach((state) => {
    const entity = players.get(state.id);
    if (entity && !entity.isLocal) {
      // Atualiza apenas jogadores remotos
      // O jogador local será atualizado pela predição local (Fase 2)
      entity.updateState(state);
    }
  });
}

/**
 * Chamado quando desconectado do servidor.
 */
function handleDisconnected(): void {
  console.log('[Main] Desconectado do servidor!');

  // Remove todos os jogadores
  players.forEach((entity) => {
    entity.destroy(renderer.scene);
  });
  players.clear();

  // Mostra mensagem
  statusElement.style.display = 'block';
  statusElement.style.opacity = '1';
  statusElement.style.color = '#ff4444';
  statusElement.textContent = 'Desconectado do servidor!';
  crosshairElement.style.display = 'none';
}

// ============================================================
// Iniciar o jogo!
// ============================================================
init().catch((error) => {
  console.error('[Main] Erro fatal:', error);
  statusElement.textContent = `Erro fatal: ${error.message}`;
  statusElement.style.color = '#ff4444';
});
