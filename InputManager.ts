// ============================================================
// InputManager - Captura e gerencia inputs de teclado e mouse.
// Responsável por Pointer Lock (captura do mouse para FPS)
// e por traduzir teclas em ações do jogo.
//
// O InputManager NÃO move o jogador diretamente - ele apenas
// acumula o estado das teclas e movimentos do mouse para
// serem consumidos pelo game loop.
// ============================================================

export interface InputState {
  /** Teclas de movimento */
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  jump: boolean;
  crouch: boolean;
  sprint: boolean;

  /** Movimentação acumulada do mouse desde o último poll */
  mouseDeltaX: number;
  mouseDeltaY: number;
}

export class InputManager {
  /** Estado atual das teclas */
  private keys: Map<string, boolean> = new Map();

  /** Delta do mouse acumulado */
  private mouseDX = 0;
  private mouseDY = 0;

  /** Sensibilidade do mouse */
  public sensitivity = 0.002;

  /** Yaw e Pitch acumulados da câmera */
  public yaw = 0;
  public pitch = 0;

  /** Pointer Lock está ativo? */
  public isLocked = false;

  /** Referência ao elemento que recebe o Pointer Lock */
  private targetElement: HTMLElement;

  constructor(targetElement: HTMLElement) {
    this.targetElement = targetElement;

    // ============================
    // Keyboard handlers
    // ============================
    window.addEventListener('keydown', (e) => {
      this.keys.set(e.code, true);
      // Previne scroll com WASD/Space
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys.set(e.code, false);
    });

    // ============================
    // Mouse handlers (Pointer Lock)
    // ============================
    document.addEventListener('pointerlockchange', () => {
      this.isLocked = document.pointerLockElement === this.targetElement;
      console.log(`[Input] Pointer Lock: ${this.isLocked ? 'ATIVO' : 'INATIVO'}`);
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.isLocked) return;

      // Acumula deltas do mouse
      this.mouseDX += e.movementX;
      this.mouseDY += e.movementY;

      // Atualiza yaw/pitch em tempo real
      this.yaw -= e.movementX * this.sensitivity;
      this.pitch -= e.movementY * this.sensitivity;

      // Limita pitch para não virar de cabeça para baixo
      this.pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.pitch));
    });

    // Clique para ativar Pointer Lock
    this.targetElement.addEventListener('click', () => {
      if (!this.isLocked) {
        this.targetElement.requestPointerLock();
      }
    });

    console.log('[Input] InputManager inicializado. Clique na tela para capturar o mouse.');
  }

  /**
   * Verifica se uma tecla está pressionada.
   */
  isKeyDown(code: string): boolean {
    return this.keys.get(code) ?? false;
  }

  /**
   * Retorna o estado completo de input e reseta os deltas do mouse.
   * Chamado uma vez por frame pelo game loop.
   */
  pollInput(): InputState {
    const state: InputState = {
      forward: this.isKeyDown('KeyW') || this.isKeyDown('ArrowUp'),
      backward: this.isKeyDown('KeyS') || this.isKeyDown('ArrowDown'),
      left: this.isKeyDown('KeyA') || this.isKeyDown('ArrowLeft'),
      right: this.isKeyDown('KeyD') || this.isKeyDown('ArrowRight'),
      jump: this.isKeyDown('Space'),
      crouch: this.isKeyDown('ControlLeft') || this.isKeyDown('KeyC'),
      sprint: this.isKeyDown('ShiftLeft'),
      mouseDeltaX: this.mouseDX,
      mouseDeltaY: this.mouseDY,
    };

    // Reseta deltas do mouse após poll
    this.mouseDX = 0;
    this.mouseDY = 0;

    return state;
  }

  /**
   * Libera o Pointer Lock.
   */
  unlock(): void {
    document.exitPointerLock();
  }

  /**
   * Limpa todos os estados de tecla (útil ao perder foco).
   */
  resetKeys(): void {
    this.keys.clear();
    this.mouseDX = 0;
    this.mouseDY = 0;
  }
}
