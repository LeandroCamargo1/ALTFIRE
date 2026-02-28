// ============================================================
// PlayerEntity - Representação visual de um jogador na cena.
// Cada jogador (local ou remoto) é um cubo colorido com
// indicador de direção. Na Fase 3, será substituído por
// modelo low-poly.
// ============================================================

import * as THREE from 'three';
import { PlayerState, Vec3 } from '@shared/types';
import { PLAYER_HEIGHT, PLAYER_WIDTH } from '@shared/constants';

/** Cores disponíveis para jogadores (cíclicas) */
const PLAYER_COLORS = [
  0x00ff00, // Verde (jogador local)
  0xff4444, // Vermelho
  0x4444ff, // Azul
  0xffff00, // Amarelo
  0xff00ff, // Magenta
  0x00ffff, // Ciano
  0xff8800, // Laranja
  0x88ff00, // Lima
];

export class PlayerEntity {
  /** ID do jogador */
  public id: string;

  /** Nome do jogador */
  public name: string;

  /** Mesh principal (cubo representando o corpo) */
  public mesh: THREE.Group;

  /** Mesh do corpo */
  private bodyMesh: THREE.Mesh;

  /** Mesh do indicador de direção (frente do jogador) */
  private directionIndicator: THREE.Mesh;

  /** Label com o nome do jogador (sprite) */
  private nameLabel: THREE.Sprite;

  /** É o jogador local? */
  public isLocal: boolean;

  /** Posição alvo (para interpolação de jogadores remotos) */
  private targetPosition: Vec3;

  /** Rotação alvo (para interpolação) */
  private targetRotation: { yaw: number; pitch: number };

  /** Velocidade de interpolação */
  private readonly LERP_SPEED = 12;

  constructor(
    state: PlayerState,
    scene: THREE.Scene,
    isLocal: boolean,
    colorIndex: number = 0,
  ) {
    this.id = state.id;
    this.name = state.name;
    this.isLocal = isLocal;
    this.targetPosition = { ...state.position };
    this.targetRotation = { ...state.rotation };

    // Grupo que contém todas as partes visuais do jogador
    this.mesh = new THREE.Group();

    // ============================
    // Corpo (Cubo Low-Poly)
    // ============================
    const color = isLocal ? PLAYER_COLORS[0] : PLAYER_COLORS[colorIndex % PLAYER_COLORS.length];
    const bodyGeometry = new THREE.BoxGeometry(PLAYER_WIDTH, PLAYER_HEIGHT, PLAYER_WIDTH);
    const bodyMaterial = new THREE.MeshLambertMaterial({
      color,
      flatShading: true,
    });
    this.bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
    this.bodyMesh.position.y = PLAYER_HEIGHT / 2; // Pivô na base
    this.mesh.add(this.bodyMesh);

    // ============================
    // Indicador de Direção (frente)
    // ============================
    const indicatorGeometry = new THREE.BoxGeometry(0.15, 0.15, 0.3);
    const indicatorMaterial = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      flatShading: true,
    });
    this.directionIndicator = new THREE.Mesh(indicatorGeometry, indicatorMaterial);
    this.directionIndicator.position.set(0, PLAYER_HEIGHT * 0.85, -PLAYER_WIDTH / 2 - 0.15);
    this.mesh.add(this.directionIndicator);

    // ============================
    // Label com nome
    // ============================
    this.nameLabel = this.createNameLabel(state.name, color);
    this.nameLabel.position.y = PLAYER_HEIGHT + 0.4;
    this.mesh.add(this.nameLabel);

    // Posição inicial
    this.mesh.position.set(state.position.x, state.position.y - PLAYER_HEIGHT / 2, state.position.z);

    // Se for local, o mesh fica invisível (câmera em primeira pessoa)
    if (isLocal) {
      this.mesh.visible = false;
    }

    // Adiciona à cena
    scene.add(this.mesh);

    console.log(`[PlayerEntity] Criado: ${state.name} (${isLocal ? 'LOCAL' : 'REMOTO'}) cor: #${color.toString(16)}`);
  }

  /**
   * Cria um sprite de texto com o nome do jogador.
   */
  private createNameLabel(name: string, color: number): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    // Fundo semi-transparente
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.roundRect(0, 0, 256, 64, 8);
    ctx.fill();

    // Texto
    ctx.font = 'bold 28px monospace';
    ctx.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name, 128, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
    });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(2, 0.5, 1);

    return sprite;
  }

  /**
   * Atualiza o estado alvo do jogador (chamado quando recebe snapshot).
   */
  updateState(state: PlayerState): void {
    this.targetPosition = { ...state.position };
    this.targetRotation = { ...state.rotation };
  }

  /**
   * Atualiza a posição visual com interpolação suave.
   * Chamado a cada frame de renderização.
   */
  update(deltaTime: number): void {
    if (this.isLocal) return; // Jogador local é controlado pela câmera

    // Interpolação suave da posição
    const lerpFactor = 1 - Math.exp(-this.LERP_SPEED * deltaTime);

    this.mesh.position.x += (this.targetPosition.x - this.mesh.position.x) * lerpFactor;
    this.mesh.position.y += ((this.targetPosition.y - PLAYER_HEIGHT / 2) - this.mesh.position.y) * lerpFactor;
    this.mesh.position.z += (this.targetPosition.z - this.mesh.position.z) * lerpFactor;

    // Interpolação da rotação (yaw apenas, para o corpo)
    const currentYaw = this.mesh.rotation.y;
    const targetYaw = this.targetRotation.yaw;

    // Calcula a menor diferença angular
    let deltaYaw = targetYaw - currentYaw;
    while (deltaYaw > Math.PI) deltaYaw -= 2 * Math.PI;
    while (deltaYaw < -Math.PI) deltaYaw += 2 * Math.PI;

    this.mesh.rotation.y += deltaYaw * lerpFactor;
  }

  /**
   * Remove o jogador da cena e libera recursos.
   */
  destroy(scene: THREE.Scene): void {
    scene.remove(this.mesh);

    // Limpa geometrias e materiais
    this.bodyMesh.geometry.dispose();
    (this.bodyMesh.material as THREE.Material).dispose();
    this.directionIndicator.geometry.dispose();
    (this.directionIndicator.material as THREE.Material).dispose();

    const labelMaterial = this.nameLabel.material as THREE.SpriteMaterial;
    labelMaterial.map?.dispose();
    labelMaterial.dispose();

    console.log(`[PlayerEntity] Destruído: ${this.name}`);
  }
}
