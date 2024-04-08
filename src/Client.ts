import EventEmitter from "events";
import TypedEmitter from "typed-emitter";
import {
  BandwidthLimit,
  ConnectConfig,
  CreateConfig,
  Endpoint,
  JellyfishClient,
  MessageEvents,
  Peer,
  SimulcastConfig,
  TrackBandwidthLimit,
  TrackContext,
  TrackEncoding,
} from "@jellyfish-dev/ts-client-sdk";
import { PeerId, PeerState, PeerStatus, State, Track, TrackId, TrackWithOrigin } from "./state.types";
import { DeviceManager, DeviceManagerEvents } from "./DeviceManager";
import { MediaDeviceType, ScreenShareManager, ScreenShareManagerConfig, TrackType } from "./ScreenShareManager";
import {
  DeviceManagerConfig,
  DeviceState,
  InitMediaConfig,
  UseCameraAndMicrophoneResult,
  UseUserMediaState,
} from "./types";

export type ClientApi<PeerMetadata, TrackMetadata> = {
  local: PeerState<PeerMetadata, TrackMetadata> | null;
  remote: Record<PeerId, PeerState<PeerMetadata, TrackMetadata>>;
  tracks: Record<TrackId, TrackWithOrigin<PeerMetadata, TrackMetadata>>;
  bandwidthEstimation: bigint;
  status: PeerStatus;
  media: UseUserMediaState | null;
  devices: UseCameraAndMicrophoneResult<TrackMetadata>;
  deviceManager: DeviceManager;
  screenShareManager: ScreenShareManager;
};

export interface ClientEvents<PeerMetadata, TrackMetadata> {
  /**
   * Emitted when the websocket connection is closed
   *
   * @param {CloseEvent} event - Close event object from the websocket
   */
  socketClose: (event: CloseEvent, client: ClientApi<PeerMetadata, TrackMetadata>) => void;

  /**
   * Emitted when occurs an error in the websocket connection
   *
   * @param {Event} event - Event object from the websocket
   */
  socketError: (event: Event, client: ClientApi<PeerMetadata, TrackMetadata>) => void;

  /**
   * Emitted when the websocket connection is opened
   *
   * @param {Event} event - Event object from the websocket
   */
  socketOpen: (event: Event, client: ClientApi<PeerMetadata, TrackMetadata>) => void;

  /** Emitted when authentication is successful */
  authSuccess: (client: ClientApi<PeerMetadata, TrackMetadata>) => void;

  /** Emitted when authentication fails */
  authError: (client: ClientApi<PeerMetadata, TrackMetadata>) => void;

  /** Emitted when the connection is closed */
  disconnected: (client: ClientApi<PeerMetadata, TrackMetadata>) => void;

  /**
   * Called when peer was accepted.
   */
  joined: (
    event: {
      peerId: string;
      peers: Peer<PeerMetadata, TrackMetadata>[];
    },
    client: ClientApi<PeerMetadata, TrackMetadata>,
  ) => void;

  /**
   * Called when peer was not accepted
   * @param metadata - Pass through for client application to communicate further actions to frontend
   */
  joinError: (metadata: any, client: ClientApi<PeerMetadata, TrackMetadata>) => void; // eslint-disable-line @typescript-eslint/no-explicit-any

  /**
   * Called when data in a new track arrives.
   *
   * This callback is always called after {@link MessageEvents.trackAdded}.
   * It informs user that data related to the given track arrives and can be played or displayed.
   */
  trackReady: (ctx: TrackContext<PeerMetadata, TrackMetadata>, client: ClientApi<PeerMetadata, TrackMetadata>) => void;

  /**
   * Called each time the peer which was already in the room, adds new track. Fields track and stream will be set to null.
   * These fields will be set to non-null value in {@link MessageEvents.trackReady}
   */
  trackAdded: (ctx: TrackContext<PeerMetadata, TrackMetadata>, client: ClientApi<PeerMetadata, TrackMetadata>) => void;

  /**
   * Called when some track will no longer be sent.
   *
   * It will also be called before {@link MessageEvents.peerLeft} for each track of this peer.
   */
  trackRemoved: (
    ctx: TrackContext<PeerMetadata, TrackMetadata>,
    client: ClientApi<PeerMetadata, TrackMetadata>,
  ) => void;

  /**
   * Called each time peer has its track metadata updated.
   */
  trackUpdated: (
    ctx: TrackContext<PeerMetadata, TrackMetadata>,
    client: ClientApi<PeerMetadata, TrackMetadata>,
  ) => void;

  /**
   * Called each time new peer joins the room.
   */
  peerJoined: (peer: Peer<PeerMetadata, TrackMetadata>, client: ClientApi<PeerMetadata, TrackMetadata>) => void;

  /**
   * Called each time peer leaves the room.
   */
  peerLeft: (peer: Peer<PeerMetadata, TrackMetadata>, client: ClientApi<PeerMetadata, TrackMetadata>) => void;

  /**
   * Called each time peer has its metadata updated.
   */
  peerUpdated: (peer: Peer<PeerMetadata, TrackMetadata>, client: ClientApi<PeerMetadata, TrackMetadata>) => void;

  /**
   * Called in case of errors related to multimedia session e.g. ICE connection.
   */
  connectionError: (message: string, client: ClientApi<PeerMetadata, TrackMetadata>) => void;

  /**
   * Called every time the server estimates client's bandiwdth.
   *
   * @param {bigint} estimation - client's available incoming bitrate estimated
   * by the server. It's measured in bits per second.
   */
  bandwidthEstimationChanged: (estimation: bigint, client: ClientApi<PeerMetadata, TrackMetadata>) => void;

  // track context events
  encodingChanged: (
    context: TrackContext<PeerMetadata, TrackMetadata>,
    client: ClientApi<PeerMetadata, TrackMetadata>,
  ) => void;

  /**
   * Emitted every time an update about voice activity is received from the server.
   */
  voiceActivityChanged: (
    context: TrackContext<PeerMetadata, TrackMetadata>,
    client: ClientApi<PeerMetadata, TrackMetadata>,
  ) => void;

  // device manager events
  managerStarted: (
    event: Parameters<DeviceManagerEvents["managerInitialized"]>[0] & {
      mediaDeviceType: MediaDeviceType;
    },
    client: ClientApi<PeerMetadata, TrackMetadata>,
  ) => void;
  managerInitialized: (
    event: { audio?: DeviceState; video?: DeviceState; mediaDeviceType: MediaDeviceType },
    client: ClientApi<PeerMetadata, TrackMetadata>,
  ) => void;
  deviceReady: (
    event: Parameters<DeviceManagerEvents["deviceReady"]>[0] & { mediaDeviceType: MediaDeviceType },
    client: ClientApi<PeerMetadata, TrackMetadata>,
  ) => void;
  devicesStarted: (
    event: Parameters<DeviceManagerEvents["devicesStarted"]>[0] & { mediaDeviceType: MediaDeviceType },
    client: ClientApi<PeerMetadata, TrackMetadata>,
  ) => void;
  devicesReady: (
    event: Parameters<DeviceManagerEvents["devicesReady"]>[0] & { mediaDeviceType: MediaDeviceType },
    client: ClientApi<PeerMetadata, TrackMetadata>,
  ) => void;
  deviceStopped: (
    event: Parameters<DeviceManagerEvents["deviceStopped"]>[0] & { mediaDeviceType: MediaDeviceType },
    client: ClientApi<PeerMetadata, TrackMetadata>,
  ) => void;
  deviceEnabled: (
    event: Parameters<DeviceManagerEvents["deviceEnabled"]>[0] & {
      mediaDeviceType: MediaDeviceType;
    },
    client: ClientApi<PeerMetadata, TrackMetadata>,
  ) => void;
  deviceDisabled: (
    event: Parameters<DeviceManagerEvents["deviceDisabled"]>[0] & {
      mediaDeviceType: MediaDeviceType;
    },
    client: ClientApi<PeerMetadata, TrackMetadata>,
  ) => void;
  error: (arg: any, client: ClientApi<PeerMetadata, TrackMetadata>) => void;

  targetTrackEncodingRequested: (
    event: Parameters<MessageEvents<PeerMetadata, TrackMetadata>["targetTrackEncodingRequested"]>[0],
    client: ClientApi<PeerMetadata, TrackMetadata>,
  ) => void;
  localTrackAdded: (
    event: Parameters<MessageEvents<PeerMetadata, TrackMetadata>["localTrackAdded"]>[0],
    client: ClientApi<PeerMetadata, TrackMetadata>,
  ) => void;
  localTrackRemoved: (
    event: Parameters<MessageEvents<PeerMetadata, TrackMetadata>["localTrackRemoved"]>[0],
    client: ClientApi<PeerMetadata, TrackMetadata>,
  ) => void;
  localTrackReplaced: (
    event: Parameters<MessageEvents<PeerMetadata, TrackMetadata>["localTrackReplaced"]>[0],
    client: ClientApi<PeerMetadata, TrackMetadata>,
  ) => void;
  localTrackBandwidthSet: (
    event: Parameters<MessageEvents<PeerMetadata, TrackMetadata>["localTrackBandwidthSet"]>[0],
    client: ClientApi<PeerMetadata, TrackMetadata>,
  ) => void;
  localTrackEncodingBandwidthSet: (
    event: Parameters<MessageEvents<PeerMetadata, TrackMetadata>["localTrackEncodingBandwidthSet"]>[0],
    client: ClientApi<PeerMetadata, TrackMetadata>,
  ) => void;
  localTrackEncodingEnabled: (
    event: Parameters<MessageEvents<PeerMetadata, TrackMetadata>["localTrackEncodingEnabled"]>[0],
    client: ClientApi<PeerMetadata, TrackMetadata>,
  ) => void;
  localTrackEncodingDisabled: (
    event: Parameters<MessageEvents<PeerMetadata, TrackMetadata>["localTrackEncodingDisabled"]>[0],
    client: ClientApi<PeerMetadata, TrackMetadata>,
  ) => void;
  localEndpointMetadataChanged: (
    event: Parameters<MessageEvents<PeerMetadata, TrackMetadata>["localEndpointMetadataChanged"]>[0],
    client: ClientApi<PeerMetadata, TrackMetadata>,
  ) => void;
  localTrackMetadataChanged: (
    event: Parameters<MessageEvents<PeerMetadata, TrackMetadata>["localTrackMetadataChanged"]>[0],
    client: ClientApi<PeerMetadata, TrackMetadata>,
  ) => void;
  disconnectRequested: (
    event: Parameters<MessageEvents<PeerMetadata, TrackMetadata>["disconnectRequested"]>[0],
    client: ClientApi<PeerMetadata, TrackMetadata>,
  ) => void;
}

export type ReactClientCreteConfig<PeerMetadata, TrackMetadata> = {
  clientConfig?: CreateConfig<PeerMetadata, TrackMetadata>;
  deviceManagerDefaultConfig?: DeviceManagerConfig;
  screenShareManagerDefaultConfig?: ScreenShareManagerConfig;
};

const NOOP = () => {};

// todo store last selected device in local storage
export class Client<PeerMetadata, TrackMetadata> extends (EventEmitter as {
  new <PeerMetadata, TrackMetadata>(): TypedEmitter<Required<ClientEvents<PeerMetadata, TrackMetadata>>>;
})<PeerMetadata, TrackMetadata> {
  private readonly tsClient: JellyfishClient<PeerMetadata, TrackMetadata>;
  public readonly deviceManager: DeviceManager;
  public readonly screenShareManager: ScreenShareManager;

  public local: PeerState<PeerMetadata, TrackMetadata> | null = null;
  public remote: Record<PeerId, PeerState<PeerMetadata, TrackMetadata>> = {};
  public tracks: Record<TrackId, TrackWithOrigin<PeerMetadata, TrackMetadata>> = {};
  public bandwidthEstimation: bigint = BigInt(0);
  public status: PeerStatus = null;
  public media: UseUserMediaState | null = null;
  public devices: UseCameraAndMicrophoneResult<TrackMetadata>;

  private currentMicrophoneTrackId: string | null = null;
  private currentCameraTrackId: string | null = null;
  private currentScreenShareTrackId: string | null = null;

  constructor(config?: ReactClientCreteConfig<PeerMetadata, TrackMetadata>) {
    super();

    this.tsClient = new JellyfishClient<PeerMetadata, TrackMetadata>(config?.clientConfig);
    this.deviceManager = new DeviceManager(config?.deviceManagerDefaultConfig);
    this.screenShareManager = new ScreenShareManager(config?.screenShareManagerDefaultConfig);

    this.devices = {
      init: NOOP,
      start: NOOP,
      camera: {
        stop: NOOP,
        setEnable: NOOP,
        start: NOOP,
        addTrack: (
          trackMetadata?: TrackMetadata,
          simulcastConfig?: SimulcastConfig,
          maxBandwidth?: TrackBandwidthLimit,
        ) => Promise.reject(),
        removeTrack: () => Promise.reject(),
        replaceTrack: (newTrack: MediaStreamTrack, stream: MediaStream, newTrackMetadata?: TrackMetadata) =>
          Promise.reject(),
        broadcast: null,
        status: null,
        stream: null,
        track: null,
        enabled: false,
        mediaStatus: null,
        deviceInfo: null,
        error: null,
        devices: null,
      },
      microphone: {
        stop: NOOP,
        setEnable: NOOP,
        start: NOOP,
        addTrack: (trackMetadata?: TrackMetadata, maxBandwidth?: TrackBandwidthLimit) => Promise.reject(),
        removeTrack: () => Promise.reject(),
        replaceTrack: (newTrack: MediaStreamTrack, stream: MediaStream, newTrackMetadata?: TrackMetadata) =>
          Promise.reject(),
        broadcast: null,
        status: null,
        stream: null,
        track: null,
        enabled: false,
        mediaStatus: null,
        deviceInfo: null,
        error: null,
        devices: null,
      },
      screenShare: {
        stop: NOOP,
        setEnable: NOOP,
        start: NOOP,
        addTrack: (trackMetadata?: TrackMetadata, maxBandwidth?: TrackBandwidthLimit) => Promise.reject(),
        removeTrack: () => Promise.reject(),
        replaceTrack: (newTrack: MediaStreamTrack, stream: MediaStream, newTrackMetadata?: TrackMetadata) =>
          Promise.reject(),
        broadcast: null,
        status: null,
        stream: null,
        track: null,
        enabled: false,
        mediaStatus: null,
        error: null,
      },
    };

    this.stateToSnapshot();

    // todo should we remove this callbacks in destrutcot?

    this.tsClient.on("socketOpen", (event) => {
      this.status = "connected";
      this.stateToSnapshot();

      this.emit("socketOpen", event, this);
    });

    this.tsClient.on("socketError", (event) => {
      this.stateToSnapshot();

      this.emit("socketError", event, this);
    });

    this.tsClient.on("socketClose", (event) => {
      this.stateToSnapshot();

      this.emit("socketClose", event, this);
    });

    this.tsClient.on("authSuccess", () => {
      this.status = "authenticated";
      this.stateToSnapshot();

      this.emit("authSuccess", this);
    });

    this.tsClient.on("authError", () => {
      this.stateToSnapshot();

      this.emit("authError", this);
    });

    this.tsClient.on("disconnected", () => {
      this.status = null;
      this.stateToSnapshot();

      this.emit("disconnected", this);
    });

    this.tsClient.on("joined", (peerId: string, peersInRoom: Peer<PeerMetadata, TrackMetadata>[]) => {
      this.status = "joined";
      this.stateToSnapshot();

      this.emit("joined", { peerId, peers: peersInRoom }, this);
    });

    this.tsClient.on("joinError", (metadata) => {
      this.status = "error";
      this.stateToSnapshot();

      this.emit("joinError", metadata, this);
    });
    this.tsClient.on("peerJoined", (peer) => {
      this.stateToSnapshot();

      this.emit("peerJoined", peer, this);
    });
    this.tsClient.on("peerUpdated", (peer) => {
      this.stateToSnapshot();

      this.emit("peerUpdated", peer, this);
    });
    this.tsClient.on("peerLeft", (peer) => {
      this.stateToSnapshot();

      this.emit("peerLeft", peer, this);
    });
    this.tsClient.on("trackReady", (ctx) => {
      this.stateToSnapshot();

      this.emit("trackReady", ctx, this);
    });
    this.tsClient.on("trackAdded", (ctx) => {
      this.stateToSnapshot();

      this.emit("trackAdded", ctx, this);

      ctx.on("encodingChanged", () => {
        this.stateToSnapshot();

        this.emit("encodingChanged", ctx, this);
      });
      ctx.on("voiceActivityChanged", () => {
        this.stateToSnapshot();

        this.emit("voiceActivityChanged", ctx, this);
      });
    });
    this.tsClient.on("trackRemoved", (ctx) => {
      this.stateToSnapshot();

      this.emit("trackRemoved", ctx, this);
      ctx.removeAllListeners();
    });
    this.tsClient.on("trackUpdated", (ctx) => {
      this.stateToSnapshot();

      this.emit("trackUpdated", ctx, this);
    });
    this.tsClient.on("bandwidthEstimationChanged", (estimation) => {
      this.stateToSnapshot();

      this.emit("bandwidthEstimationChanged", estimation, this);
    });

    this.deviceManager.on("deviceDisabled", (event) => {
      this.stateToSnapshot();

      this.emit("deviceDisabled", { ...event, mediaDeviceType: "userMedia" }, this);
    });

    this.deviceManager.on("deviceEnabled", (event) => {
      this.stateToSnapshot();

      this.emit("deviceEnabled", { ...event, mediaDeviceType: "userMedia" }, this);
    });

    this.deviceManager.on("managerInitialized", (event) => {
      this.stateToSnapshot();

      this.emit("managerInitialized", { ...event, mediaDeviceType: "userMedia" }, this);
    });

    this.deviceManager.on("managerStarted", (event) => {
      this.stateToSnapshot();

      this.emit("managerStarted", { ...event, mediaDeviceType: "userMedia" }, this);
    });

    this.deviceManager.on("deviceStopped", (event) => {
      this.stateToSnapshot();

      this.emit("deviceStopped", { trackType: event.trackType, mediaDeviceType: "userMedia" }, this);
    });

    this.deviceManager.on("deviceReady", (event) => {
      this.stateToSnapshot();

      this.emit("deviceReady", { ...event, mediaDeviceType: "userMedia" }, this);
    });

    this.deviceManager.on("devicesStarted", (event) => {
      this.stateToSnapshot();

      this.emit("devicesStarted", { ...event, mediaDeviceType: "userMedia" }, this);
    });

    this.deviceManager.on("devicesReady", (event) => {
      this.stateToSnapshot();

      this.emit("devicesReady", { ...event, mediaDeviceType: "userMedia" }, this);
    });

    this.deviceManager.on("error", (event) => {
      this.stateToSnapshot();

      this.emit("error", event, this);
    });

    this.screenShareManager.on("deviceDisabled", (event) => {
      this.stateToSnapshot();

      this.emit("deviceDisabled", { trackType: event.type, mediaDeviceType: "displayMedia" }, this);
    });

    this.screenShareManager.on("deviceEnabled", (event) => {
      this.stateToSnapshot();

      this.emit("deviceEnabled", { trackType: event.type, mediaDeviceType: "displayMedia" }, this);
    });

    this.screenShareManager.on("deviceStopped", async (event, state) => {
      this.stateToSnapshot();

      this.emit("deviceStopped", { trackType: event.type, mediaDeviceType: "displayMedia" }, this);
    });

    this.screenShareManager.on("deviceReady", (event, state) => {
      this.stateToSnapshot();

      if (!state.videoMedia?.stream) throw Error("Invalid screen share state");

      this.emit(
        "deviceReady",
        {
          trackType: event.type,
          stream: state.videoMedia.stream,
          mediaDeviceType: "displayMedia",
        },
        this,
      );
    });

    this.screenShareManager.on("error", (a) => {
      this.stateToSnapshot();

      this.emit("error", a, this);
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.tsClient?.on("targetTrackEncodingRequested", (event: any) => {
      this.stateToSnapshot();

      this.emit("targetTrackEncodingRequested", event, this);
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.tsClient?.on("localTrackAdded", (event: any) => {
      this.stateToSnapshot();

      this.emit("localTrackAdded", event, this);
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.tsClient?.on("localTrackRemoved", (event: any) => {
      this.stateToSnapshot();

      this.emit("localTrackRemoved", event, this);
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.tsClient?.on("localTrackReplaced", (event: any) => {
      this.stateToSnapshot();

      this.emit("localTrackReplaced", event, this);
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.tsClient?.on("localTrackBandwidthSet", (event: any) => {
      this.stateToSnapshot();

      this.emit("localTrackBandwidthSet", event, this);
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.tsClient?.on("localTrackEncodingBandwidthSet", (event: any) => {
      this.stateToSnapshot();

      this.emit("localTrackEncodingBandwidthSet", event, this);
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.tsClient?.on("localTrackEncodingEnabled", (event: any) => {
      this.stateToSnapshot();

      this.emit("localTrackEncodingEnabled", event, this);
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.tsClient?.on("localTrackEncodingDisabled", (event: any) => {
      this.stateToSnapshot();

      this.emit("localTrackEncodingDisabled", event, this);
    });

    this.tsClient?.on("localEndpointMetadataChanged", (event: any) => {
      this.stateToSnapshot();

      this.emit("localEndpointMetadataChanged", event, this);
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.tsClient?.on("localTrackMetadataChanged", (event: any) => {
      this.stateToSnapshot();

      this.emit("localTrackMetadataChanged", event, this);
    });

    this.tsClient?.on("disconnectRequested", (event: any) => {
      this.stateToSnapshot();

      this.emit("disconnectRequested", event, this);
    });
  }

  public setScreenManagerConfig(config: ScreenShareManagerConfig) {
    this.screenShareManager?.setConfig(config);
  }

  public setDeviceManagerConfig(config: DeviceManagerConfig) {
    this.deviceManager?.setConfig(config);
  }

  private trackContextToTrack(track: TrackContext<PeerMetadata, TrackMetadata>): Track<TrackMetadata> {
    return {
      rawMetadata: track.rawMetadata,
      metadata: track.metadata,
      trackId: track.trackId,
      stream: track.stream,
      simulcastConfig: track.simulcastConfig || null,
      encoding: track.encoding || null,
      vadStatus: track.vadStatus,
      track: track.track,
      metadataParsingError: track.metadataParsingError,
    };
  }

  public connect(config: ConnectConfig<PeerMetadata>): void {
    this.status = "connecting";
    this.tsClient.connect(config);
  }

  public disconnect() {
    this.status = null;
    this.tsClient.disconnect();
  }

  public addTrack(
    track: MediaStreamTrack,
    stream: MediaStream,
    trackMetadata?: TrackMetadata,
    simulcastConfig: SimulcastConfig = { enabled: false, activeEncodings: [], disabledEncodings: [] },
    maxBandwidth: TrackBandwidthLimit = 0, // unlimited bandwidth
  ): Promise<string> {
    if (!this.tsClient) throw Error("Client not initialized");

    return this.tsClient.addTrack(track, stream, trackMetadata, simulcastConfig, maxBandwidth);
  }

  public removeTrack(trackId: string): Promise<void> {
    return this.tsClient.removeTrack(trackId);
  }

  public replaceTrack(trackId: string, newTrack: MediaStreamTrack, newTrackMetadata?: TrackMetadata): Promise<void> {
    return this.tsClient.replaceTrack(trackId, newTrack, newTrackMetadata);
  }

  public getStatistics(selector?: MediaStreamTrack | null): Promise<RTCStatsReport> {
    return this.tsClient.getStatistics(selector);
  }

  public getBandwidthEstimation(): bigint {
    return this.tsClient.getBandwidthEstimation();
  }

  public setTrackBandwidth(trackId: string, bandwidth: BandwidthLimit): Promise<boolean> {
    return this.tsClient.setTrackBandwidth(trackId, bandwidth);
  }

  public setEncodingBandwidth(trackId: string, rid: string, bandwidth: BandwidthLimit): Promise<boolean> {
    return this.tsClient.setEncodingBandwidth(trackId, rid, bandwidth);
  }

  public setTargetTrackEncoding(trackId: string, encoding: TrackEncoding) {
    return this.tsClient.setTargetTrackEncoding(trackId, encoding);
  }

  public enableTrackEncoding(trackId: string, encoding: TrackEncoding) {
    return this.tsClient.enableTrackEncoding(trackId, encoding);
  }

  public disableTrackEncoding(trackId: string, encoding: TrackEncoding) {
    return this.tsClient.disableTrackEncoding(trackId, encoding);
  }

  public updatePeerMetadata = (peerMetadata: PeerMetadata): void => {
    this.tsClient.updatePeerMetadata(peerMetadata);
  };

  public updateTrackMetadata = (trackId: string, trackMetadata: TrackMetadata): void => {
    this.tsClient.updateTrackMetadata(trackId, trackMetadata);
  };

  private stateToSnapshot() {
    if (!this.deviceManager) Error("Device manager is null");

    const screenShareManager = this.screenShareManager?.getSnapshot();
    const deviceManagerSnapshot = this?.deviceManager?.getSnapshot();

    const localEndpoint = this.tsClient.getLocalEndpoint();

    const localTracks: Record<TrackId, Track<TrackMetadata>> = {};
    (localEndpoint?.tracks || new Map()).forEach((track) => {
      localTracks[track.trackId] = this.trackContextToTrack(track);
    });

    const broadcastedVideoTrack = Object.values(localTracks).find(
      (track) => track.track?.id === this.currentCameraTrackId,
    );

    const broadcastedAudioTrack = Object.values(localTracks).find(
      (track) => track.track?.id === this.currentMicrophoneTrackId,
    );

    // todo add audio media
    const screenShareVideoTrack = Object.values(localTracks).find(
      (track) => track.track?.id === this.currentScreenShareTrackId,
    );

    const devices: UseCameraAndMicrophoneResult<TrackMetadata> = {
      init: (config?: InitMediaConfig) => {
        this?.deviceManager?.init(config);
      },
      start: (config) => this?.deviceManager?.start(config),
      camera: {
        stop: () => {
          this?.deviceManager?.stop("video");
        },
        setEnable: (value: boolean) => this?.deviceManager?.setEnable("video", value),
        start: (deviceId?: string) => {
          this?.deviceManager?.start({ videoDeviceId: deviceId ?? true });
        },
        addTrack: (
          trackMetadata?: TrackMetadata,
          simulcastConfig?: SimulcastConfig,
          maxBandwidth?: TrackBandwidthLimit,
        ) => {
          const media = this.deviceManager?.video.media;

          if (!media || !media.stream || !media.track) throw Error("Device is unavailable");
          const { stream, track } = media;

          const prevTrack = Object.values(localTracks).find((track) => track.track?.id === this.currentCameraTrackId);

          if (prevTrack) throw Error("Track already added");

          this.currentCameraTrackId = track?.id;

          return this.tsClient.addTrack(track, stream, trackMetadata, simulcastConfig, maxBandwidth);
        },
        removeTrack: () => {
          const prevTrack = Object.values(localTracks).find((track) => track.track?.id === this.currentCameraTrackId);

          if (!prevTrack) throw Error("There is no video track");

          this.currentCameraTrackId = null;

          return this.tsClient.removeTrack(prevTrack.trackId);
        },
        replaceTrack: (newTrack: MediaStreamTrack, stream: MediaStream, newTrackMetadata?: TrackMetadata) => {
          const prevTrack = Object.values(localTracks).find((track) => track.track?.id === this.currentCameraTrackId);

          if (!prevTrack) throw Error("There is no video track");

          this.currentCameraTrackId = newTrack.id;

          return this.tsClient.replaceTrack(prevTrack.trackId, newTrack, newTrackMetadata);
        },
        broadcast: broadcastedVideoTrack ?? null,
        status: deviceManagerSnapshot?.video?.devicesStatus || null,
        stream: deviceManagerSnapshot?.video.media?.stream || null,
        track: deviceManagerSnapshot?.video.media?.track || null,
        enabled: deviceManagerSnapshot?.video.media?.enabled || false,
        deviceInfo: deviceManagerSnapshot?.video.media?.deviceInfo || null,
        mediaStatus: deviceManagerSnapshot?.video.mediaStatus || null,
        error: deviceManagerSnapshot?.video?.error || null,
        devices: deviceManagerSnapshot?.video?.devices || null,
      },
      microphone: {
        stop: () => this?.deviceManager?.stop("audio"),
        setEnable: (value: boolean) => this?.deviceManager?.setEnable("audio", value),
        start: (deviceId?: string) => {
          this?.deviceManager?.start({ audioDeviceId: deviceId ?? true });
        },
        addTrack: (trackMetadata?: TrackMetadata, maxBandwidth?: TrackBandwidthLimit) => {
          const media = this.deviceManager?.audio.media;

          if (!media || !media.stream || !media.track) throw Error("Device is unavailable");
          const { stream, track } = media;

          const prevTrack = Object.values(localTracks).find(
            (track) => track.track?.id === this.currentMicrophoneTrackId,
          );

          if (prevTrack) throw Error("Track already added");

          this.currentMicrophoneTrackId = track.id;

          return this.tsClient.addTrack(track, stream, trackMetadata);
        },
        removeTrack: () => {
          const prevTrack = Object.values(localTracks).find(
            (track) => track.track?.id === this.currentMicrophoneTrackId,
          );

          if (!prevTrack) throw Error("There is no audio track");

          this.currentMicrophoneTrackId = null;

          return this.tsClient.removeTrack(prevTrack.trackId);
        },
        replaceTrack: (newTrack: MediaStreamTrack, stream: MediaStream, newTrackMetadata?: TrackMetadata) => {
          const prevTrack = Object.values(localTracks).find(
            (track) => track.track?.id === this.currentMicrophoneTrackId,
          );

          if (!prevTrack) throw Error("There is no audio track");

          this.currentMicrophoneTrackId = newTrack.id;

          return this.tsClient.replaceTrack(prevTrack.trackId, newTrack, newTrackMetadata);
        },
        broadcast: broadcastedAudioTrack ?? null,
        status: deviceManagerSnapshot?.audio?.devicesStatus || null,
        stream: deviceManagerSnapshot?.audio.media?.stream || null,
        track: deviceManagerSnapshot?.audio.media?.track || null,
        enabled: deviceManagerSnapshot?.audio.media?.enabled || false,
        deviceInfo: deviceManagerSnapshot?.audio.media?.deviceInfo || null,
        mediaStatus: deviceManagerSnapshot?.video.mediaStatus || null,
        error: deviceManagerSnapshot?.audio?.error || null,
        devices: deviceManagerSnapshot?.audio?.devices || null,
      },
      screenShare: {
        stop: () => {
          this?.screenShareManager?.stop("video");
        },
        setEnable: (value: boolean) => this.screenShareManager?.setEnable("video", value),
        start: (config?: ScreenShareManagerConfig) => {
          // todo add config
          this.screenShareManager?.start(config);
        },
        addTrack: (trackMetadata?: TrackMetadata, maxBandwidth?: TrackBandwidthLimit) => {
          const media = this.screenShareManager?.getSnapshot().videoMedia;

          if (!media || !media.stream || !media.track) throw Error("Device is unavailable");
          const { stream, track } = media;

          const prevTrack = Object.values(localTracks).find(
            (track) => track.track?.id === this.currentScreenShareTrackId,
          );

          if (prevTrack) throw Error("Track already added");

          this.currentScreenShareTrackId = track?.id;

          return this.tsClient.addTrack(track, stream, trackMetadata, undefined, maxBandwidth);
        },
        removeTrack: () => {
          const prevTrack = Object.values(localTracks).find(
            (track) => track.track?.id === this.currentScreenShareTrackId,
          );

          if (!prevTrack) throw Error("There is no video track");

          this.currentScreenShareTrackId = null;

          return this.tsClient.removeTrack(prevTrack.trackId);
        },
        replaceTrack: (newTrack: MediaStreamTrack, stream: MediaStream, newTrackMetadata?: TrackMetadata) => {
          const prevTrack = Object.values(localTracks).find(
            (track) => track.track?.id === this.currentScreenShareTrackId,
          );

          if (!prevTrack) throw Error("There is no video track");

          this.currentScreenShareTrackId = newTrack.id;

          return this.tsClient.replaceTrack(prevTrack.trackId, newTrack, newTrackMetadata);
        },
        broadcast: screenShareVideoTrack ?? null,
        // todo separate audio and video
        status: screenShareManager?.status || null,
        // deviceStatus: screenShareManager?.devicesStatus || null,
        mediaStatus: null,
        stream: screenShareManager?.videoMedia?.stream || null,
        track: screenShareManager?.videoMedia?.track || null,
        enabled: screenShareManager?.videoMedia?.enabled || false,
        error: screenShareManager?.error || null,
      },
    };

    if (!this.tsClient["webrtc"]) {
      this.media = deviceManagerSnapshot || null;
      this.tracks = {};
      this.devices = devices;
      this.remote = {};
      this.local = null;
      this.bandwidthEstimation = 0n;

      return;
    }

    const remote: Record<PeerId, PeerState<PeerMetadata, TrackMetadata>> = {};

    const tracksWithOrigin: Record<TrackId, TrackWithOrigin<PeerMetadata, TrackMetadata>> = {};

    Object.values(this.tsClient.getRemotePeers()).forEach((endpoint) => {
      const tracks: Record<TrackId, Track<TrackMetadata>> = {};
      endpoint.tracks.forEach((track) => {
        const mappedTrack = this.trackContextToTrack(track);
        tracks[track.trackId] = mappedTrack;
        tracksWithOrigin[track.trackId] = { ...mappedTrack, origin: endpoint };
      });

      remote[endpoint.id] = {
        rawMetadata: endpoint.rawMetadata,
        metadata: endpoint.metadata,
        metadataParsingError: endpoint.metadataParsingError,
        id: endpoint.id,
        tracks,
      };
    });

    this.tracks = tracksWithOrigin;
    this.media = deviceManagerSnapshot || null;
    this.local = localEndpoint
      ? {
          id: localEndpoint.id,
          metadata: localEndpoint.metadata,
          metadataParsingError: localEndpoint.metadataParsingError,
          rawMetadata: localEndpoint.rawMetadata,
          tracks: localTracks, // to record
        }
      : null;
    this.remote = remote;
    this.bandwidthEstimation = this.tsClient.getBandwidthEstimation();
    this.devices = devices;
  }
}