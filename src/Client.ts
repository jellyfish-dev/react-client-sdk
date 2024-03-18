import EventEmitter from "events";
import TypedEmitter from "typed-emitter";
import {
  BandwidthLimit,
  ConnectConfig,
  CreateConfig,
  Endpoint,
  JellyfishClient,
  Peer,
  SimulcastConfig,
  TrackBandwidthLimit,
  TrackContext,
  TrackEncoding,
} from "@jellyfish-dev/ts-client-sdk";
import { PeerId, PeerState, PeerStatus, State, Track, TrackId, TrackWithOrigin } from "./state.types";
import { DeviceManager } from "./DeviceManager";
import { ScreenShareManager, StartScreenShareConfig, TrackType } from "./ScreenShareManager";
import { DeviceState, InitMediaConfig, UseCameraAndMicrophoneResult, UseUserMediaConfig } from "./types";

export type ClientApiState<PeerMetadata, TrackMetadata> = {
  getSnapshot(): State<PeerMetadata, TrackMetadata>;
  getApi(): any;
};

export interface ClientEvents<PeerMetadata, TrackMetadata> {
  /**
   * Emitted when the websocket connection is closed
   *
   * @param {CloseEvent} event - Close event object from the websocket
   */
  socketClose: (event: CloseEvent, client: ClientApiState<PeerMetadata, TrackMetadata>) => void;

  /**
   * Emitted when occurs an error in the websocket connection
   *
   * @param {Event} event - Event object from the websocket
   */
  socketError: (event: Event, client: ClientApiState<PeerMetadata, TrackMetadata>) => void;

  /**
   * Emitted when the websocket connection is opened
   *
   * @param {Event} event - Event object from the websocket
   */
  socketOpen: (event: Event, client: ClientApiState<PeerMetadata, TrackMetadata>) => void;

  /** Emitted when authentication is successful */
  authSuccess: (client: ClientApiState<PeerMetadata, TrackMetadata>) => void;

  /** Emitted when authentication fails */
  authError: (client: ClientApiState<PeerMetadata, TrackMetadata>) => void;

  /** Emitted when the connection is closed */
  disconnected: (client: ClientApiState<PeerMetadata, TrackMetadata>) => void;

  /**
   * Called when peer was accepted.
   */
  joined: (
    event: {
      peerId: string;
      peers: Peer<PeerMetadata, TrackMetadata>[];
    },
    client: ClientApiState<PeerMetadata, TrackMetadata>,
  ) => void;

  /**
   * Called when peer was not accepted
   * @param metadata - Pass through for client application to communicate further actions to frontend
   */
  joinError: (metadata: any, client: ClientApiState<PeerMetadata, TrackMetadata>) => void; // eslint-disable-line @typescript-eslint/no-explicit-any

  /**
   * Called when data in a new track arrives.
   *
   * This callback is always called after {@link MessageEvents.trackAdded}.
   * It informs user that data related to the given track arrives and can be played or displayed.
   */
  trackReady: (
    ctx: TrackContext<PeerMetadata, TrackMetadata>,
    client: ClientApiState<PeerMetadata, TrackMetadata>,
  ) => void;

  /**
   * Called each time the peer which was already in the room, adds new track. Fields track and stream will be set to null.
   * These fields will be set to non-null value in {@link MessageEvents.trackReady}
   */
  trackAdded: (
    ctx: TrackContext<PeerMetadata, TrackMetadata>,
    client: ClientApiState<PeerMetadata, TrackMetadata>,
  ) => void;

  /**
   * Called when some track will no longer be sent.
   *
   * It will also be called before {@link MessageEvents.peerLeft} for each track of this peer.
   */
  trackRemoved: (
    ctx: TrackContext<PeerMetadata, TrackMetadata>,
    client: ClientApiState<PeerMetadata, TrackMetadata>,
  ) => void;

  /**
   * Called each time peer has its track metadata updated.
   */
  trackUpdated: (
    ctx: TrackContext<PeerMetadata, TrackMetadata>,
    client: ClientApiState<PeerMetadata, TrackMetadata>,
  ) => void;

  /**
   * Called each time new peer joins the room.
   */
  peerJoined: (peer: Peer<PeerMetadata, TrackMetadata>, client: ClientApiState<PeerMetadata, TrackMetadata>) => void;

  /**
   * Called each time peer leaves the room.
   */
  peerLeft: (peer: Peer<PeerMetadata, TrackMetadata>, client: ClientApiState<PeerMetadata, TrackMetadata>) => void;

  /**
   * Called each time peer has its metadata updated.
   */
  peerUpdated: (peer: Peer<PeerMetadata, TrackMetadata>, client: ClientApiState<PeerMetadata, TrackMetadata>) => void;

  /**
   * Called in case of errors related to multimedia session e.g. ICE connection.
   */
  connectionError: (message: string, client: ClientApiState<PeerMetadata, TrackMetadata>) => void;

  /**
   * Called every time the server estimates client's bandiwdth.
   *
   * @param {bigint} estimation - client's available incoming bitrate estimated
   * by the server. It's measured in bits per second.
   */
  bandwidthEstimationChanged: (estimation: bigint, client: ClientApiState<PeerMetadata, TrackMetadata>) => void;

  // track context events
  encodingChanged: (
    context: TrackContext<PeerMetadata, TrackMetadata>,
    client: ClientApiState<PeerMetadata, TrackMetadata>,
  ) => void;

  /**
   * Emitted every time an update about voice activity is received from the server.
   */
  voiceActivityChanged: (
    context: TrackContext<PeerMetadata, TrackMetadata>,
    client: ClientApiState<PeerMetadata, TrackMetadata>,
  ) => void;

  // device manager events
  managerStarted: (arg: any, client: ClientApiState<PeerMetadata, TrackMetadata>) => void;
  managerInitialized: (
    event: { audio?: DeviceState; video?: DeviceState },
    client: ClientApiState<PeerMetadata, TrackMetadata>,
  ) => void;
  deviceReady: (event: { type: TrackType }, client: ClientApiState<PeerMetadata, TrackMetadata>) => void;
  devicesReady: (event: any, client: ClientApiState<PeerMetadata, TrackMetadata>) => void;
  deviceStopped: (arg: any, client: ClientApiState<PeerMetadata, TrackMetadata>) => void;
  deviceEnabled: (arg: any, client: ClientApiState<PeerMetadata, TrackMetadata>) => void;
  deviceDisabled: (arg: any, client: ClientApiState<PeerMetadata, TrackMetadata>) => void;
  error: (arg: any, client: ClientApiState<PeerMetadata, TrackMetadata>) => void;

  // new
  targetTrackEncodingRequested: (event: any, client: ClientApiState<PeerMetadata, TrackMetadata>) => void; // eslint-disable-line @typescript-eslint/no-explicit-any

  // local events
  localTrackAdded: (event: any, client: ClientApiState<PeerMetadata, TrackMetadata>) => void; // eslint-disable-line @typescript-eslint/no-explicit-any
  localTrackRemoved: (event: any, client: ClientApiState<PeerMetadata, TrackMetadata>) => void; // eslint-disable-line @typescript-eslint/no-explicit-any
  localTrackReplaced: (event: any, client: ClientApiState<PeerMetadata, TrackMetadata>) => void; // eslint-disable-line @typescript-eslint/no-explicit-any
  localTrackBandwidthSet: (event: any, client: ClientApiState<PeerMetadata, TrackMetadata>) => void; // eslint-disable-line @typescript-eslint/no-explicit-any
  localTrackEncodingBandwidthSet: (event: any, client: ClientApiState<PeerMetadata, TrackMetadata>) => void; // eslint-disable-line @typescript-eslint/no-explicit-any
  localTrackEncodingEnabled: (event: any, client: ClientApiState<PeerMetadata, TrackMetadata>) => void; // eslint-disable-line @typescript-eslint/no-explicit-any
  localTrackEncodingDisabled: (event: any, client: ClientApiState<PeerMetadata, TrackMetadata>) => void; // eslint-disable-line @typescript-eslint/no-explicit-any
  localEndpointMetadataChanged: (event: any, client: ClientApiState<PeerMetadata, TrackMetadata>) => void; // eslint-disable-line @typescript-eslint/no-explicit-any
  localTrackMetadataChanged: (event: any, client: ClientApiState<PeerMetadata, TrackMetadata>) => void; // eslint-disable-line @typescript-eslint/no-explicit-any

  disconnectRequested: (event: any, client: ClientApiState<PeerMetadata, TrackMetadata>) => void; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export class Client<PeerMetadata, TrackMetadata>
  extends (EventEmitter as {
    new <PeerMetadata, TrackMetadata>(): TypedEmitter<Required<ClientEvents<PeerMetadata, TrackMetadata>>>;
  })<PeerMetadata, TrackMetadata>
  implements ClientApiState<PeerMetadata, TrackMetadata>
{
  private readonly client: JellyfishClient<PeerMetadata, TrackMetadata>;
  private readonly deviceManager: DeviceManager | null = null;
  private readonly screenShareManager: ScreenShareManager | null = null;
  private state: State<PeerMetadata, TrackMetadata> | null = null;
  private status: null | PeerStatus = null;

  constructor(config?: {
    clientConfig?: CreateConfig<PeerMetadata, TrackMetadata>;
    deviceManagerDefaultConfig?: UseUserMediaConfig;
    screenShareManagerDefaultConfig?: StartScreenShareConfig;
  }) {
    super();
    this.client = new JellyfishClient<PeerMetadata, TrackMetadata>(config?.clientConfig);
    this.deviceManager = new DeviceManager(config?.deviceManagerDefaultConfig);
    this.screenShareManager = new ScreenShareManager(config?.screenShareManagerDefaultConfig);

    this.state = this.stateToSnapshot();

    this.client.on("socketOpen", (event) => {
      this.status = "connected";
      this.state = this.stateToSnapshot();

      this.emit("socketOpen", event, this);
    });

    this.client.on("socketError", (event) => {
      this.state = this.stateToSnapshot();

      this.emit("socketError", event, this);
    });

    this.client.on("socketClose", (event) => {
      this.state = this.stateToSnapshot();

      this.emit("socketClose", event, this);
    });

    this.client.on("authSuccess", () => {
      this.status = "authenticated";
      this.state = this.stateToSnapshot();

      this.emit("authSuccess", this);
    });

    this.client.on("authError", () => {
      this.state = this.stateToSnapshot();

      this.emit("authError", this);
    });

    this.client.on("disconnected", () => {
      this.status = null;
      this.state = this.stateToSnapshot();

      this.emit("disconnected", this);
    });

    this.client.on("joined", (peerId: string, peersInRoom: Endpoint<PeerMetadata, TrackMetadata>[]) => {
      this.status = "joined";
      this.state = this.stateToSnapshot();

      this.emit("joined", { peerId, peers: peersInRoom }, this);
    });

    this.client.on("joinError", (metadata) => {
      this.status = "error";
      this.state = this.stateToSnapshot();

      this.emit("joinError", metadata, this);
    });
    this.client.on("peerJoined", (peer) => {
      this.state = this.stateToSnapshot();

      this.emit("peerJoined", peer, this);
    });
    this.client.on("peerUpdated", (peer) => {
      this.state = this.stateToSnapshot();

      this.emit("peerUpdated", peer, this);
    });
    this.client.on("peerLeft", (peer) => {
      this.state = this.stateToSnapshot();

      this.emit("peerLeft", peer, this);
    });
    this.client.on("trackReady", (ctx) => {
      console.log({ name: "trackReady", ctx });
      this.state = this.stateToSnapshot();

      this.emit("trackReady", ctx, this);
    });
    this.client.on("trackAdded", (ctx) => {
      console.log({ name: "trackAdded", ctx });
      this.state = this.stateToSnapshot();

      this.emit("trackAdded", ctx, this);

      ctx.on("encodingChanged", () => {
        this.state = this.stateToSnapshot();

        this.emit("encodingChanged", ctx, this);
      });
      ctx.on("voiceActivityChanged", () => {
        this.state = this.stateToSnapshot();

        this.emit("voiceActivityChanged", ctx, this);
      });
    });
    this.client.on("trackRemoved", (ctx) => {
      console.log({ name: "trackRemoved", ctx });
      this.state = this.stateToSnapshot();

      this.emit("trackRemoved", ctx, this);
      ctx.removeAllListeners();
    });
    this.client.on("trackUpdated", (ctx) => {
      console.log({ name: "trackUpdated", ctx });

      this.state = this.stateToSnapshot();

      this.emit("trackUpdated", ctx, this);
    });
    this.client.on("bandwidthEstimationChanged", (estimation) => {
      this.state = this.stateToSnapshot();

      this.emit("bandwidthEstimationChanged", estimation, this);
    });

    this.deviceManager.on("deviceDisabled", (a) => {
      this.state = this.stateToSnapshot();

      this.emit("deviceDisabled", a, this);
    });

    this.deviceManager.on("deviceEnabled", (a) => {
      this.state = this.stateToSnapshot();

      this.emit("deviceEnabled", a, this);
    });

    this.deviceManager.on("managerInitialized", (event) => {
      this.state = this.stateToSnapshot();

      this.emit("managerInitialized", event, this);
    });

    this.deviceManager.on("managerStarted", (a) => {
      this.state = this.stateToSnapshot();

      this.emit("managerStarted", a, this);
    });

    this.deviceManager.on("deviceStopped", (a) => {
      this.state = this.stateToSnapshot();

      this.emit("deviceStopped", a, this);
    });

    this.deviceManager.on("deviceReady", (a) => {
      this.state = this.stateToSnapshot();

      this.emit("deviceReady", a, this);
    });

    this.deviceManager.on("devicesReady", (a) => {
      this.state = this.stateToSnapshot();

      this.emit("devicesReady", a, this);
    });

    this.deviceManager.on("error", (a) => {
      this.state = this.stateToSnapshot();

      this.emit("error", a, this);
    });

    this.screenShareManager.on("deviceDisabled", (a) => {
      this.state = this.stateToSnapshot();

      this.emit("deviceDisabled", a, this);
    });

    this.screenShareManager.on("deviceEnabled", (a) => {
      this.state = this.stateToSnapshot();

      this.emit("deviceEnabled", a, this);
    });

    this.screenShareManager.on("deviceStopped", async (event, state) => {
      console.log({ name: "deviceStopped", event, state });

      // todo:
      //  Add to camera and microphone
      //  Add parameter to config
      //  Remove track from WebRTC if it is stopped.
      if (this.state?.devices?.screenShare?.broadcast?.trackId) {
        console.log({ name: "removeTrack", event, state });

        await this.client.removeTrack(this.state.devices.screenShare.broadcast.trackId);
      }

      this.state = this.stateToSnapshot();

      this.emit("deviceStopped", event, this);
    });

    this.screenShareManager.on("deviceReady", (event, state) => {
      this.state = this.stateToSnapshot();

      this.emit("deviceReady", event, this);
    });

    this.screenShareManager.on("error", (a) => {
      this.state = this.stateToSnapshot();

      this.emit("error", a, this);
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.client?.on("targetTrackEncodingRequested", (event: any) => {
      this.state = this.stateToSnapshot();

      this.emit("targetTrackEncodingRequested", event, this);
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.client?.on("localTrackAdded", (event: any) => {
      this.state = this.stateToSnapshot();

      this.emit("localTrackAdded", event, this);
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.client?.on("localTrackRemoved", (event: any) => {
      this.state = this.stateToSnapshot();

      this.emit("localTrackRemoved", event, this);
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.client?.on("localTrackReplaced", (event: any) => {
      this.state = this.stateToSnapshot();

      this.emit("localTrackReplaced", event, this);
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.client?.on("localTrackBandwidthSet", (event: any) => {
      this.state = this.stateToSnapshot();

      this.emit("localTrackBandwidthSet", event, this);
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.client?.on("localTrackEncodingBandwidthSet", (event: any) => {
      this.state = this.stateToSnapshot();

      this.emit("localTrackEncodingBandwidthSet", event, this);
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.client?.on("localTrackEncodingEnabled", (event: any) => {
      this.state = this.stateToSnapshot();

      this.emit("localTrackEncodingEnabled", event, this);
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.client?.on("localTrackEncodingDisabled", (event: any) => {
      this.state = this.stateToSnapshot();

      this.emit("localTrackEncodingDisabled", event, this);
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.client?.on("localEndpointMetadataChanged", (event: any) => {
      this.state = this.stateToSnapshot();

      this.emit("localEndpointMetadataChanged", event, this);
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.client?.on("localTrackMetadataChanged", (event: any) => {
      this.state = this.stateToSnapshot();

      this.emit("localTrackMetadataChanged", event, this);
    });
    this.client?.on("disconnectRequested", (event: any) => {
      this.state = this.stateToSnapshot();

      this.emit("disconnectRequested", event, this);
    });
  }

  getApi() {
    throw new Error("Method not implemented.");
  }

  public getSnapshot() {
    if (!this.state) {
      this.state = this.stateToSnapshot();
    }

    return this.state;
  }

  public setScreenManagerConfig(config: StartScreenShareConfig) {
    this.screenShareManager?.setConfig(config);
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
    this.client.connect(config);
  }

  public disconnect() {
    this.status = null;
    this.client.disconnect();
  }

  public addTrack(
    track: MediaStreamTrack,
    stream: MediaStream,
    trackMetadata?: TrackMetadata,
    simulcastConfig: SimulcastConfig = { enabled: false, activeEncodings: [], disabledEncodings: [] },
    maxBandwidth: TrackBandwidthLimit = 0, // unlimited bandwidth
  ): Promise<string> {
    if (!this.client) throw Error("Client not initialized");

    return this.client.addTrack(track, stream, trackMetadata, simulcastConfig, maxBandwidth);
  }

  public removeTrack(trackId: string): Promise<void> {
    return this.client.removeTrack(trackId);
  }

  public replaceTrack(trackId: string, newTrack: MediaStreamTrack, newTrackMetadata?: TrackMetadata): Promise<void> {
    return this.client.replaceTrack(trackId, newTrack, newTrackMetadata);
  }

  public getStatistics(selector?: MediaStreamTrack | null): Promise<RTCStatsReport> {
    return this.client.getStatistics(selector);
  }

  public getBandwidthEstimation(): bigint {
    return this.client.getBandwidthEstimation();
  }

  public setTrackBandwidth(trackId: string, bandwidth: BandwidthLimit): Promise<boolean> {
    return this.client.setTrackBandwidth(trackId, bandwidth);
  }

  public setEncodingBandwidth(trackId: string, rid: string, bandwidth: BandwidthLimit): Promise<boolean> {
    return this.client.setEncodingBandwidth(trackId, rid, bandwidth);
  }

  public setTargetTrackEncoding(trackId: string, encoding: TrackEncoding) {
    return this.client.setTargetTrackEncoding(trackId, encoding);
  }

  public enableTrackEncoding(trackId: string, encoding: TrackEncoding) {
    return this.client.enableTrackEncoding(trackId, encoding);
  }

  public disableTrackEncoding(trackId: string, encoding: TrackEncoding) {
    return this.client.disableTrackEncoding(trackId, encoding);
  }

  public updatePeerMetadata = (peerMetadata: PeerMetadata): void => {
    this.client.updatePeerMetadata(peerMetadata);
  };

  public updateTrackMetadata = (trackId: string, trackMetadata: TrackMetadata): void => {
    this.client.updateTrackMetadata(trackId, trackMetadata);
  };

  private stateToSnapshot(): State<PeerMetadata, TrackMetadata> {
    if (!this.deviceManager) Error("Device manager is null");

    const screenShareManager = this.screenShareManager?.getSnapshot();
    const deviceManagerSnapshot = this?.deviceManager?.getSnapshot();

    const localEndpoint = this.client.getLocalEndpoint();

    const localTracks: Record<TrackId, Track<TrackMetadata>> = {};
    (localEndpoint?.tracks || new Map()).forEach((track) => {
      localTracks[track.trackId] = this.trackContextToTrack(track);
    });

    // todo this could be track from device manager or different track
    //  if user invoked replaceTrack with custom stream
    const broadcastedVideoTrack = Object.values(localTracks).find(
      (track) => track.track?.id === this.deviceManager?.video.media?.track?.id,
    );

    const broadcastedAudioTrack = Object.values(localTracks).find(
      (track) => track.track?.id === this.deviceManager?.audio.media?.track?.id,
    );

    // todo add audio media
    const screenShareVideoTrack = Object.values(localTracks).find(
      (track) => track.track?.id === this.screenShareManager?.getSnapshot()?.videoMedia?.track?.id,
    );

    const devices: UseCameraAndMicrophoneResult<TrackMetadata> = {
      init: (config?: InitMediaConfig) => {
        console.log({ name: "Init from new Client", config });
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
          console.log("Add video track!");
          const media = this.deviceManager?.video.media;

          if (!media || !media.stream || !media.track) throw Error("Device is unavailable");
          const { stream, track } = media;

          const prevTrack = Object.values(localTracks).find(
            (track) => track.track?.id === this.deviceManager?.video.media?.track?.id,
          );

          if (prevTrack) throw Error("Track already added");

          return this.client.addTrack(track, stream, trackMetadata, simulcastConfig, maxBandwidth);
        },
        removeTrack: () => {
          const prevTrack = Object.values(localTracks).find(
            (track) => track.track?.id === this.deviceManager?.video.media?.track?.id,
          );

          if (!prevTrack) throw Error("There is no video track");

          return this.client.removeTrack(prevTrack.trackId);
        },
        replaceTrack: (newTrack: MediaStreamTrack, stream: MediaStream, newTrackMetadata?: TrackMetadata) => {
          const prevTrack = Object.values(localTracks).find(
            (track) => track.track?.id === this.deviceManager?.video.media?.track?.id,
          );

          if (!prevTrack) throw Error("There is no video track");

          return this.client.replaceTrack(prevTrack.trackId, newTrack, newTrackMetadata);
        },
        broadcast: broadcastedVideoTrack ?? null,
        status: deviceManagerSnapshot?.video?.status || null,
        stream: deviceManagerSnapshot?.video.media?.stream || null,
        track: deviceManagerSnapshot?.video.media?.track || null,
        enabled: deviceManagerSnapshot?.video.media?.enabled || false,
        deviceInfo: deviceManagerSnapshot?.video.media?.deviceInfo || null,
        error: deviceManagerSnapshot?.video?.error || null,
        devices: deviceManagerSnapshot?.video?.devices || null,
      },
      microphone: {
        stop: () => this?.deviceManager?.stop("audio"),
        setEnable: (value: boolean) => this?.deviceManager?.setEnable("audio", value),
        start: (deviceId?: string) => {
          this?.deviceManager?.start({ audioDeviceId: deviceId ?? true });
        },
        addTrack: (trackMetadata?: TrackMetadata) => {
          const media = this.deviceManager?.audio.media;

          if (!media || !media.stream || !media.track) throw Error("Device is unavailable");
          const { stream, track } = media;

          const prevTrack = Object.values(localTracks).find(
            (track) => track.track?.id === this.deviceManager?.audio.media?.track?.id,
          );

          if (prevTrack) throw Error("Track already added");

          return this.client.addTrack(track, stream, trackMetadata);
        },
        removeTrack: () => {
          const prevTrack = Object.values(localTracks).find(
            (track) => track.track?.id === this.deviceManager?.audio.media?.track?.id,
          );

          if (!prevTrack) throw Error("There is no audio track");

          return this.client.removeTrack(prevTrack.trackId);
        },
        replaceTrack: (newTrack: MediaStreamTrack, stream: MediaStream, newTrackMetadata?: TrackMetadata) => {
          const prevTrack = Object.values(localTracks).find(
            (track) => track.track?.id === this.deviceManager?.audio.media?.track?.id,
          );

          if (!prevTrack) throw Error("There is no audio track");

          return this.client.replaceTrack(prevTrack.trackId, newTrack, newTrackMetadata);
        },
        broadcast: broadcastedAudioTrack ?? null,
        status: deviceManagerSnapshot?.audio?.status || null,
        stream: deviceManagerSnapshot?.audio.media?.stream || null,
        track: deviceManagerSnapshot?.audio.media?.track || null,
        enabled: deviceManagerSnapshot?.audio.media?.enabled || false,
        deviceInfo: deviceManagerSnapshot?.audio.media?.deviceInfo || null,
        error: deviceManagerSnapshot?.audio?.error || null,
        devices: deviceManagerSnapshot?.audio?.devices || null,
      },
      screenShare: {
        stop: () => {
          this?.screenShareManager?.stop("video");
        },
        setEnable: (value: boolean) => this.screenShareManager?.setEnable("video", value),
        start: (config?: StartScreenShareConfig) => {
          // todo add config
          console.log({ config, name: "ScreenShare start" });
          this.screenShareManager?.start(config);
        },
        addTrack: (trackMetadata?: TrackMetadata, maxBandwidth?: TrackBandwidthLimit) => {
          console.log("Add video track!");
          const media = this.screenShareManager?.getSnapshot().videoMedia;

          if (!media || !media.stream || !media.track) throw Error("Device is unavailable");
          const { stream, track } = media;

          const prevTrack = Object.values(localTracks).find(
            (track) => track.track?.id === this.screenShareManager?.getSnapshot().videoMedia?.track?.id,
          );

          if (prevTrack) throw Error("Track already added");

          return this.client.addTrack(track, stream, trackMetadata, undefined, maxBandwidth);
        },
        removeTrack: () => {
          const prevTrack = Object.values(localTracks).find(
            (track) => track.track?.id === this.screenShareManager?.getSnapshot().videoMedia?.track?.id,
          );

          if (!prevTrack) throw Error("There is no video track");

          return this.client.removeTrack(prevTrack.trackId);
        },
        replaceTrack: (newTrack: MediaStreamTrack, stream: MediaStream, newTrackMetadata?: TrackMetadata) => {
          const prevTrack = Object.values(localTracks).find(
            (track) => track.track?.id === this.screenShareManager?.getSnapshot().videoMedia?.track?.id,
          );

          if (!prevTrack) throw Error("There is no video track");

          return this.client.replaceTrack(prevTrack.trackId, newTrack, newTrackMetadata);
        },
        broadcast: screenShareVideoTrack ?? null,
        // todo separate audio and video
        status: screenShareManager?.status || null,
        stream: screenShareManager?.videoMedia?.stream || null,
        track: screenShareManager?.videoMedia?.track || null,
        enabled: screenShareManager?.videoMedia?.enabled || false,
        error: screenShareManager?.error || null,
      },
    };

    if (!this.client["webrtc"]) {
      return {
        client: this,
        media: deviceManagerSnapshot || null,
        tracks: {},
        status: this.status,
        devices: devices,
        remote: {},
        local: null,
        bandwidthEstimation: 0n,
      };
    }

    const remote: Record<PeerId, PeerState<PeerMetadata, TrackMetadata>> = {};

    const tracksWithOrigin: Record<TrackId, TrackWithOrigin<PeerMetadata, TrackMetadata>> = {};

    Object.values(this.client.getRemoteEndpoints()).forEach((endpoint) => {
      const tracks: Record<TrackId, Track<TrackMetadata>> = {};
      endpoint.tracks.forEach((track) => {
        const mappedTrack = this.trackContextToTrack(track);
        tracks[track.trackId] = mappedTrack;
        const trackToAdd = { ...mappedTrack, origin: endpoint };
        console.log({ trackToAdd, mappedTrack, track });
        tracksWithOrigin[track.trackId] = trackToAdd;
      });

      remote[endpoint.id] = {
        rawMetadata: endpoint.rawMetadata,
        metadata: endpoint.metadata,
        metadataParsingError: endpoint.metadataParsingError,
        id: endpoint.id,
        tracks,
      };
    });

    const newVar: State<PeerMetadata, TrackMetadata> = {
      client: this,
      media: deviceManagerSnapshot || null,
      local: localEndpoint
        ? {
            id: localEndpoint.id,
            metadata: localEndpoint.metadata,
            metadataParsingError: localEndpoint.metadataParsingError,
            rawMetadata: localEndpoint.rawMetadata,
            tracks: localTracks, // to record
          }
        : null,
      status: this.status,
      remote,
      bandwidthEstimation: this.client.getBandwidthEstimation(),
      tracks: tracksWithOrigin,
      devices: devices,
    };

    console.log({ newVar });

    return newVar;
  }
}
