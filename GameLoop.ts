// ============================================================
// GameLoop (Server) - Loop principal do servidor que roda a
// uma taxa fixa (SERVER_TICK_RATE). Responsável por atualizar
// a simulação de física e estado do mundo.
// ============================================================

import { SERVER_TICK_RATE, SERVER_TICK_INTERVAL } from '../../shared/constants.js';

export class GameLoop {
  /** Callback executado a cada tick */
  private updateFn: (deltaTime: number) => void;

  /** Indica se o loop está rodando */
  private running = false;

  /** ID do timer para limpeza */
  private timerId: ReturnType<typeof setTimeout> | null = null;

  /** Timestamp do último tick */
  private lastTickTime = 0;

  /** Contador de ticks para logging */
  private tickCount = 0;

  /** Intervalo de log (a cada N ticks) */
  private logInterval = SERVER_TICK_RATE * 30; // Log a cada 30 segundos

  constructor(updateFn: (deltaTime: number) => void) {
    this.updateFn = updateFn;
  }

  /**
   * Inicia o game loop do servidor a uma taxa fixa.
   * Usa setTimeout recursivo para maior precisão que setInterval.
   */
  start(): void {
    if (this.running) {
      console.warn('[GameLoop] Já está rodando!');
      return;
    }

    this.running = true;
    this.lastTickTime = performance.now();
    this.tickCount = 0;

    console.log(`[GameLoop] Iniciado a ${SERVER_TICK_RATE}Hz (${SERVER_TICK_INTERVAL.toFixed(2)}ms por tick)`);

    this.tick();
  }

  /**
   * Executa um tick e agenda o próximo.
   * Calcula delta time real para compensar variações de timing.
   */
  private tick(): void {
    if (!this.running) return;

    const now = performance.now();
    const deltaTime = (now - this.lastTickTime) / 1000; // Converte para segundos
    this.lastTickTime = now;

    // Executa a função de atualização
    this.updateFn(deltaTime);

    this.tickCount++;

    // Log periódico de performance
    if (this.tickCount % this.logInterval === 0) {
      console.log(`[GameLoop] Tick #${this.tickCount} | DeltaTime: ${(deltaTime * 1000).toFixed(2)}ms`);
    }

    // Agenda o próximo tick - usando setTimeout para maior controle
    const elapsed = performance.now() - now;
    const nextTickDelay = Math.max(0, SERVER_TICK_INTERVAL - elapsed);

    this.timerId = setTimeout(() => this.tick(), nextTickDelay);
  }

  /**
   * Para o game loop.
   */
  stop(): void {
    this.running = false;
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    console.log(`[GameLoop] Parado após ${this.tickCount} ticks.`);
  }

  /**
   * Retorna se o loop está rodando.
   */
  isRunning(): boolean {
    return this.running;
  }
}
