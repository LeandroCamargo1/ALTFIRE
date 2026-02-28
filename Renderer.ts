// ============================================================
// Renderer - Encapsula toda a inicialização e gerenciamento
// do Three.js. Responsável por criar a cena, câmera, e
// gerenciar o loop de renderização (requestAnimationFrame).
//
// IMPORTANTE: O loop de renderização é SEPARADO do loop de rede.
// Renderização roda a ~60fps (ou mais, via rAF).
// Rede roda a ~20Hz (snapshots do servidor).
// ============================================================

import * as THREE from 'three';

export class Renderer {
  /** Cena principal do Three.js */
  public scene: THREE.Scene;

  /** Câmera perspectiva (FPS) */
  public camera: THREE.PerspectiveCamera;

  /** Renderizador WebGL */
  public renderer: THREE.WebGLRenderer;

  /** Container HTML do jogo */
  private container: HTMLElement;

  /** Callback chamado a cada frame de renderização */
  private renderCallback: ((deltaTime: number) => void) | null = null;

  /** Clock para deltaTime preciso */
  private clock: THREE.Clock;

  /** Está rodando? */
  private running = false;

  /** FPS counter */
  private frameCount = 0;
  private fpsTime = 0;
  public currentFPS = 0;

  constructor(containerId: string) {
    // Captura o container
    this.container = document.getElementById(containerId)!;
    if (!this.container) {
      throw new Error(`Container #${containerId} não encontrado!`);
    }

    // ============================
    // Cena
    // ============================
    this.scene = new THREE.Scene();
    // Céu/fog com cor cinza azulado (estilo CS)
    this.scene.background = new THREE.Color(0x87ceeb);
    this.scene.fog = new THREE.Fog(0x87ceeb, 50, 200);

    // ============================
    // Câmera FPS
    // ============================
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(
      90,      // FOV alto para FPS competitivo
      aspect,
      0.1,     // Near plane bem perto
      500      // Far plane
    );
    this.camera.position.set(0, 1.6, 0); // Altura dos olhos

    // ============================
    // Renderizador WebGL
    // ============================
    this.renderer = new THREE.WebGLRenderer({
      antialias: false,       // Desligado para performance máxima
      powerPreference: 'high-performance',
      stencil: false,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(1); // Pixel ratio fixo para consistência competitiva
    this.renderer.shadowMap.enabled = false; // Sem sombras dinâmicas (low-poly)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    // Adiciona o canvas ao container
    this.container.appendChild(this.renderer.domElement);

    // ============================
    // Clock
    // ============================
    this.clock = new THREE.Clock();

    // ============================
    // Resize handler
    // ============================
    window.addEventListener('resize', () => this.onResize());

    console.log('[Renderer] Three.js inicializado com sucesso');
  }

  /**
   * Configura a cena base com chão e iluminação.
   * Estilo Ultra Low-Poly com Flat Shading.
   */
  setupBaseScene(): void {
    // ============================
    // Iluminação estática (Flat Shading)
    // ============================

    // Luz ambiente global
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    // Luz direcional (sol) - estática, sem sombras
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 100, 50);
    this.scene.add(directionalLight);

    // ============================
    // Chão do mapa
    // ============================
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.MeshLambertMaterial({
      color: 0x8B7355, // Cor de areia/terra (estilo Mirage)
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2; // Deita o plano
    ground.position.y = 0;
    this.scene.add(ground);

    // ============================
    // Grid sutil para referência visual
    // ============================
    const gridHelper = new THREE.GridHelper(100, 50, 0x666666, 0x444444);
    gridHelper.position.y = 0.01; // Ligeiramente acima do chão
    this.scene.add(gridHelper);

    // ============================
    // Algumas caixas de referência (futuro: paredes do Mirage)
    // ============================
    this.addReferenceBoxes();

    console.log('[Renderer] Cena base configurada (chão + iluminação)');
  }

  /**
   * Adiciona caixas de referência ao mapa para ter noção de escala.
   * Serão substituídas pela geometria real do Mirage na Fase 3.
   */
  private addReferenceBoxes(): void {
    const boxMaterial = new THREE.MeshLambertMaterial({
      color: 0xA0522D, // Marrom (paredes)
    });

    const positions: [number, number, number, number, number, number][] = [
      // [x, y, z, largura, altura, profundidade]
      [10, 1.5, 0, 2, 3, 8],    // Parede lateral direita
      [-10, 1.5, 0, 2, 3, 8],   // Parede lateral esquerda
      [0, 1.5, -12, 12, 3, 2],  // Parede de fundo
      [6, 0.75, 5, 3, 1.5, 3],  // Caixa baixa
      [-4, 0.5, -6, 2, 1, 2],   // Caixa pequena
    ];

    positions.forEach(([x, y, z, w, h, d]) => {
      const geometry = new THREE.BoxGeometry(w, h, d);
      const mesh = new THREE.Mesh(geometry, boxMaterial);
      mesh.position.set(x, y, z);
      this.scene.add(mesh);
    });
  }

  /**
   * Define o callback chamado a cada frame de renderização.
   */
  onRender(callback: (deltaTime: number) => void): void {
    this.renderCallback = callback;
  }

  /**
   * Inicia o loop de renderização via requestAnimationFrame.
   * SEPARADO do loop de rede para performance máxima.
   */
  startRenderLoop(): void {
    if (this.running) return;
    this.running = true;
    this.clock.start();

    console.log('[Renderer] Render loop iniciado');

    const animate = () => {
      if (!this.running) return;
      requestAnimationFrame(animate);

      const deltaTime = this.clock.getDelta();

      // Atualiza FPS counter
      this.frameCount++;
      this.fpsTime += deltaTime;
      if (this.fpsTime >= 1.0) {
        this.currentFPS = this.frameCount;
        this.frameCount = 0;
        this.fpsTime = 0;
      }

      // Executa callback de update (lógica do jogo no cliente)
      if (this.renderCallback) {
        this.renderCallback(deltaTime);
      }

      // Renderiza a cena
      this.renderer.render(this.scene, this.camera);
    };

    animate();
  }

  /**
   * Para o loop de renderização.
   */
  stopRenderLoop(): void {
    this.running = false;
    console.log('[Renderer] Render loop parado');
  }

  /**
   * Handler de resize - ajusta câmera e renderer.
   */
  private onResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  /**
   * Libera recursos do Three.js.
   */
  dispose(): void {
    this.stopRenderLoop();
    this.renderer.dispose();
    // Limpa geometrias e materiais da cena
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
    console.log('[Renderer] Recursos liberados');
  }
}
