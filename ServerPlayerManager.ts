// ============================================================
// ServerPlayerManager - Gerencia o estado de todos os jogadores
// no servidor. Responsável por criação, remoção e broadcast
// do estado dos jogadores.
// ============================================================

import { PlayerState, Vec3 } from '../../shared/types.js';
import { PLAYER_HEIGHT, PLAYER_WIDTH } from '../../shared/constants.js';

/** Posições de spawn pré-definidas no mapa */
const SPAWN_POINTS: Vec3[] = [
  { x: 0, y: PLAYER_HEIGHT / 2, z: 0 },
  { x: 5, y: PLAYER_HEIGHT / 2, z: 5 },
  { x: -5, y: PLAYER_HEIGHT / 2, z: -5 },
  { x: 5, y: PLAYER_HEIGHT / 2, z: -5 },
  { x: -5, y: PLAYER_HEIGHT / 2, z: 5 },
  { x: 10, y: PLAYER_HEIGHT / 2, z: 0 },
  { x: -10, y: PLAYER_HEIGHT / 2, z: 0 },
  { x: 0, y: PLAYER_HEIGHT / 2, z: 10 },
];

export class ServerPlayerManager {
  /** Mapa de ID -> PlayerState de todos os jogadores conectados */
  private players: Map<string, PlayerState> = new Map();

  /** Índice cíclico para spawn points */
  private spawnIndex = 0;

  /**
   * Cria um novo jogador com estado inicial.
   * @param id - ID único do jogador (vindo do Geckos.io)
   * @param name - Nome de display
   * @returns O estado inicial do jogador criado
   */
  createPlayer(id: string, name: string): PlayerState {
    // Seleciona ponto de spawn ciclicamente
    const spawnPoint = SPAWN_POINTS[this.spawnIndex % SPAWN_POINTS.length];
    this.spawnIndex++;

    const player: PlayerState = {
      id,
      name,
      position: { ...spawnPoint },
      rotation: { yaw: 0, pitch: 0 },
      health: 100,
      isCrouching: false,
      isRunning: false,
      isGrounded: true,
    };

    this.players.set(id, player);
    console.log(`[PlayerManager] Jogador criado: ${name} (${id}) em (${spawnPoint.x}, ${spawnPoint.y}, ${spawnPoint.z})`);
    return player;
  }

  /**
   * Remove um jogador pelo ID.
   * @param id - ID do jogador a remover
   * @returns true se o jogador foi removido, false se não existia
   */
  removePlayer(id: string): boolean {
    const player = this.players.get(id);
    if (player) {
      console.log(`[PlayerManager] Jogador removido: ${player.name} (${id})`);
      this.players.delete(id);
      return true;
    }
    return false;
  }

  /**
   * Retorna o estado de um jogador específico.
   */
  getPlayer(id: string): PlayerState | undefined {
    return this.players.get(id);
  }

  /**
   * Retorna uma lista com o estado de todos os jogadores.
   */
  getAllPlayers(): PlayerState[] {
    return Array.from(this.players.values());
  }

  /**
   * Retorna a quantidade de jogadores conectados.
   */
  getPlayerCount(): number {
    return this.players.size;
  }

  /**
   * Atualiza a posição de um jogador (será usado com Client-Side Prediction).
   */
  updatePlayerPosition(id: string, position: Vec3): void {
    const player = this.players.get(id);
    if (player) {
      player.position = position;
    }
  }

  /**
   * Atualiza a rotação de um jogador.
   */
  updatePlayerRotation(id: string, rotation: { yaw: number; pitch: number }): void {
    const player = this.players.get(id);
    if (player) {
      player.rotation = rotation;
    }
  }
}
