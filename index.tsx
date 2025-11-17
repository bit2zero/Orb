/* tslint:disable */
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  GoogleGenAI,
  LiveServerMessage,
  Modality,
  Session,
} from '@google/genai';
import {LitElement, css, html} from 'lit';
import {customElement, state} from 'lit/decorators.js';
import {createBlob, decode, decodeAudioData} from './utils';
import './visual-3d';

const languages = [
  'None',
  'English',
  'Chinese (Mandarin)',
  'Vietnamese',
  'Korean',
  'Filipino',
  'Portuguese',
  'Indonesian',
  'Spanish',
  'Japanese',
  'French',
  'German',
];

@customElement('gdm-live-audio')
export class GdmLiveAudio extends LitElement {
  @state() isRecording = false;
  @state() status = '';
  @state() error = '';
  @state() selectedLanguage = 'None';
  @state() transcriptionLog: {speaker: string; text: string}[] = [];
  @state() currentInputText = '';
  @state() currentOutputText = '';

  private client: GoogleGenAI;
  private sessionPromise: Promise<Session>;
  // FIX: Property 'webkitAudioContext' does not exist on type 'Window & typeof globalThis'. Did you mean 'AudioContext'?
  private inputAudioContext = new (window.AudioContext ||
    (window as any).webkitAudioContext)({sampleRate: 16000});
  // FIX: Property 'webkitAudioContext' does not exist on type 'Window & typeof globalThis'. Did you mean 'AudioContext'?
  private outputAudioContext = new (window.AudioContext ||
    (window as any).webkitAudioContext)({sampleRate: 24000});
  @state() inputNode = this.inputAudioContext.createGain();
  @state() outputNode = this.outputAudioContext.createGain();
  private nextStartTime = 0;
  private mediaStream: MediaStream;
  private sourceNode: AudioBufferSourceNode;
  private scriptProcessorNode: ScriptProcessorNode;
  private sources = new Set<AudioBufferSourceNode>();

  static styles = css`
    #status {
      position: absolute;
      bottom: 5vh;
      left: 0;
      right: 0;
      z-index: 10;
      text-align: center;
      color: white;
      font-family: sans-serif;
    }

    .transcription-container {
      position: absolute;
      top: 5vh;
      left: 5vw;
      right: 5vw;
      bottom: 25vh;
      color: white;
      font-family: sans-serif;
      font-size: 1.5rem;
      overflow-y: auto;
      text-align: left;
      padding: 20px;
      background: rgba(0, 0, 0, 0.2);
      border-radius: 12px;
      z-index: 5;
    }

    .transcription-log p {
      margin: 0 0 10px 0;
    }

    .transcription-log .user {
      font-weight: bold;
      color: #a7c7e7; /* Light blue */
    }

    .transcription-log .model {
      font-weight: bold;
      color: #b19cd9; /* Light purple */
    }

    .controls {
      z-index: 10;
      position: absolute;
      bottom: 10vh;
      left: 0;
      right: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      gap: 10px;

      button {
        outline: none;
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: white;
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.1);
        width: 64px;
        height: 64px;
        cursor: pointer;
        font-size: 24px;
        padding: 0;
        margin: 0;
        display: flex;
        align-items: center;
        justify-content: center;

        &:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      }

      button[disabled] {
        display: none;
      }
    }

    .buttons-row {
      display: flex;
      gap: 10px;
    }

    .language-selector {
      display: flex;
      gap: 10px;
      align-items: center;
      color: white;
      margin-bottom: 10px;
      font-family: sans-serif;

      label {
        font-size: 1rem;
      }

      select {
        padding: 8px;
        border-radius: 8px;
        border: 1px solid rgba(255, 255, 255, 0.2);
        background: rgba(255, 255, 255, 0.1);
        color: white;
        cursor: pointer;
      }

      select option {
        background: #333;
        color: white;
      }
    }
  `;

  constructor() {
    super();
    this.client = new GoogleGenAI({
      apiKey: process.env.API_KEY,
    });
    this.outputNode.connect(this.outputAudioContext.destination);
    this.initAudio();
  }

  private initAudio() {
    this.nextStartTime = this.outputAudioContext.currentTime;
  }

  private initSession(): Promise<Session> {
    const model = 'gemini-2.5-flash-native-audio-preview-09-2025';
    let systemInstruction =
      "You are a parrot. Repeat the user's words exactly as you hear them.";
    if (this.selectedLanguage !== 'None') {
      systemInstruction = `You are a translator. Translate the user's words into ${this.selectedLanguage} and repeat them out loud.`;
    }

    this.sessionPromise = this.client.live.connect({
      model: model,
      callbacks: {
        onopen: () => {
          this.updateStatus('Connection opened');
        },
        onmessage: async (message: LiveServerMessage) => {
          const audio = message.serverContent?.modelTurn?.parts[0]?.inlineData;

          if (audio) {
            this.nextStartTime = Math.max(
              this.nextStartTime,
              this.outputAudioContext.currentTime,
            );

            const audioBuffer = await decodeAudioData(
              decode(audio.data),
              this.outputAudioContext,
              24000,
              1,
            );
            const source = this.outputAudioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(this.outputNode);
            source.addEventListener('ended', () => {
              this.sources.delete(source);
            });

            source.start(this.nextStartTime);
            this.nextStartTime = this.nextStartTime + audioBuffer.duration;
            this.sources.add(source);
          }

          if (message.serverContent?.inputTranscription) {
            this.currentInputText +=
              message.serverContent.inputTranscription.text;
          }
          if (message.serverContent?.outputTranscription) {
            this.currentOutputText +=
              message.serverContent.outputTranscription.text;
          }

          if (message.serverContent?.turnComplete) {
            const fullInput = this.currentInputText.trim();
            const fullOutput = this.currentOutputText.trim();
            const newLog = [...this.transcriptionLog];

            if (fullInput) {
              newLog.push({speaker: 'You', text: fullInput});
            }
            if (fullOutput) {
              newLog.push({speaker: 'Orb', text: fullOutput});
            }
            this.transcriptionLog = newLog;
            this.currentInputText = '';
            this.currentOutputText = '';
          }

          const interrupted = message.serverContent?.interrupted;
          if (interrupted) {
            for (const source of this.sources.values()) {
              source.stop();
              this.sources.delete(source);
            }
            this.nextStartTime = 0;
          }
        },
        onerror: (e: ErrorEvent) => {
          this.updateError(e.message);
        },
        onclose: (e: CloseEvent) => {
          this.updateStatus('Connection closed.');
        },
      },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {prebuiltVoiceConfig: {voiceName: 'Orus'}},
        },
        systemInstruction,
        inputAudioTranscription: {},
        outputAudioTranscription: {},
      },
    });
    return this.sessionPromise;
  }

  private updateStatus(msg: string) {
    this.status = msg;
  }

  private updateError(msg: string) {
    this.error = msg;
  }

  private async startRecording() {
    if (this.isRecording) {
      return;
    }

    if (!this.sessionPromise) {
      this.initSession();
    }

    this.inputAudioContext.resume();
    this.updateStatus('Requesting microphone access...');

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });

      this.updateStatus('Microphone access granted. Starting capture...');

      this.sourceNode = this.inputAudioContext.createMediaStreamSource(
        this.mediaStream,
      );
      this.sourceNode.connect(this.inputNode);

      const bufferSize = 4096;
      this.scriptProcessorNode = this.inputAudioContext.createScriptProcessor(
        bufferSize,
        1,
        1,
      );

      this.scriptProcessorNode.onaudioprocess = (audioProcessingEvent) => {
        if (!this.isRecording) return;
        const inputBuffer = audioProcessingEvent.inputBuffer;
        const pcmData = inputBuffer.getChannelData(0);
        this.sessionPromise.then((session) => {
          session.sendRealtimeInput({media: createBlob(pcmData)});
        });
      };

      this.sourceNode.connect(this.scriptProcessorNode);
      this.scriptProcessorNode.connect(this.inputAudioContext.destination);

      this.isRecording = true;
      this.updateStatus('🔴 Recording...');
    } catch (err) {
      console.error('Error starting recording:', err);
      this.updateStatus(`Error: ${err.message}`);
      this.stopRecording();
    }
  }

  private stopRecording() {
    if (!this.isRecording && !this.mediaStream && !this.inputAudioContext)
      return;

    this.updateStatus('Stopping recording...');
    this.isRecording = false;

    if (this.scriptProcessorNode && this.sourceNode && this.inputAudioContext) {
      this.scriptProcessorNode.disconnect();
      this.sourceNode.disconnect();
    }

    this.scriptProcessorNode = null;
    this.sourceNode = null;

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    this.updateStatus('Recording stopped. Click Start to begin again.');
  }

  private handleLanguageChange(e: Event) {
    const target = e.target as HTMLSelectElement;
    this.selectedLanguage = target.value;
    this.reset();
  }

  private reset() {
    this.stopRecording();
    if (this.sessionPromise) {
      this.sessionPromise.then((session) => session.close());
      this.sessionPromise = null;
    }
    this.transcriptionLog = [];
    this.currentInputText = '';
    this.currentOutputText = '';
    this.updateStatus('Session cleared. Select language and start recording.');
  }

  render() {
    return html`
      <div>
        <div class="transcription-container">
          <div class="transcription-log">
            ${this.transcriptionLog.map(
              (entry) => html`
                <p>
                  <span
                    class="${entry.speaker === 'You' ? 'user' : 'model'}"
                    >${entry.speaker}:</span
                  >
                  ${entry.text}
                </p>
              `,
            )}
            ${this.currentInputText
              ? html`<p>
                  <span class="user">You:</span> ${this.currentInputText}...
                </p>`
              : ''}
            ${this.currentOutputText
              ? html`<p>
                  <span class="model">Orb:</span> ${this.currentOutputText}...
                </p>`
              : ''}
          </div>
        </div>
        <div class="controls">
          <div class="language-selector">
            <label for="language">Translate to:</label>
            <select
              id="language"
              @change=${this.handleLanguageChange}
              .value=${this.selectedLanguage}
              ?disabled=${this.isRecording}>
              ${languages.map(
                (lang) => html`<option .value=${lang}>${lang}</option>`,
              )}
            </select>
          </div>
          <div class="buttons-row">
            <button
              id="resetButton"
              @click=${this.reset}
              ?disabled=${this.isRecording}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                height="40px"
                viewBox="0 -960 960 960"
                width="40px"
                fill="#ffffff">
                <path
                  d="M480-160q-134 0-227-93t-93-227q0-134 93-227t227-93q69 0 132 28.5T720-690v-110h80v280H520v-80h168q-32-56-87.5-88T480-720q-100 0-170 70t-70 170q0 100 70 170t170 70q77 0 139-44t87-116h84q-28 106-114 173t-196 67Z" />
              </svg>
            </button>
            <button
              id="startButton"
              @click=${this.startRecording}
              ?disabled=${this.isRecording}>
              <svg
                viewBox="0 0 100 100"
                width="32px"
                height="32px"
                fill="#c80000"
                xmlns="http://www.w3.org/2000/svg">
                <circle cx="50" cy="50" r="50" />
              </svg>
            </button>
            <button
              id="stopButton"
              @click=${this.stopRecording}
              ?disabled=${!this.isRecording}>
              <svg
                viewBox="0 0 100 100"
                width="32px"
                height="32px"
                fill="#ffffff"
                xmlns="http://www.w3.org/2000/svg">
                <rect x="15" y="15" width="70" height="70" rx="8" />
              </svg>
            </button>
          </div>
        </div>

        <div id="status">${this.error || this.status}</div>
        <gdm-live-audio-visuals-3d
          .inputNode=${this.inputNode}
          .outputNode=${this.outputNode}></gdm-live-audio-visuals-3d>
      </div>
    `;
  }
}