# CLAUDE.md - AI Assistant Guide for Orb

> **Last Updated**: November 17, 2025
> **Purpose**: Comprehensive guide for AI assistants working with the Orb codebase

---

## Project Overview

**Orb** is a real-time interactive audio visualization application that combines Google's Gemini Live Audio API with 3D graphics to create an immersive voice-based AI experience. Users can speak to the AI and see their conversation visualized as an animated 3D orb that reacts to audio frequencies in real-time.

**Key Capabilities**:
- Live bidirectional audio streaming with Google Gemini AI
- Real-time audio-reactive 3D visualization using Three.js
- Multi-language support (12 languages including translation)
- Live transcription of both user input and AI responses
- Browser-based with microphone integration

**Project Type**: Single-page web application
**Target Platform**: Modern browsers (Chrome, Safari, Firefox)
**Deployment**: AI Studio + local development via Vite

---

## Technology Stack

### Core Technologies
- **Frontend Framework**: Lit 3.3.0 (web components)
- **3D Graphics**: Three.js 0.176.0
- **AI Integration**: @google/genai 1.15.0 (Gemini Live Audio API)
- **Build Tool**: Vite 6.2.0
- **Language**: TypeScript 5.8.2 (ES2022 target)

### Runtime APIs
- **Web Audio API**: For audio capture, processing, and playback
- **MediaStream API**: For microphone access
- **WebGL**: Via Three.js for 3D rendering

### Development
- Node.js required for build tooling
- No testing framework currently configured
- No linting tools configured

---

## Codebase Structure

```
/home/user/Orb/
├── 📋 Configuration
│   ├── package.json          # Dependencies, scripts (dev, build, preview)
│   ├── tsconfig.json         # TypeScript config (ES2022, decorators, JSX)
│   ├── vite.config.ts        # Vite build config (port 3000, env vars)
│   ├── metadata.json         # AI Studio metadata (permissions)
│   └── .gitignore            # Git exclusions
│
├── 🚀 Entry Points
│   ├── index.html            # HTML entry with ES module import maps
│   ├── index.css             # Minimal global styles
│   └── index.tsx             # Main GdmLiveAudio component (415 lines)
│
├── 🎨 Core Modules
│   ├── visual-3d.ts          # 3D visualization component (246 lines)
│   ├── visual.ts             # 2D canvas visualization (UNUSED, 103 lines)
│   ├── analyser.ts           # Audio frequency analyzer (20 lines)
│   └── utils.ts              # Audio encoding/decoding (52 lines)
│
├── 🎬 Shaders
│   ├── backdrop-shader.ts    # Background gradient GLSL (26 lines)
│   └── sphere-shader.ts      # Orb deformation GLSL (73 lines)
│
├── 📦 Assets
│   └── public/
│       └── piz_compressed.exr  # HDR environment map (3.3MB)
│
└── 📖 Documentation
    ├── README.md             # User setup instructions
    └── CLAUDE.md             # This file
```

**Architecture**: Flat structure with clear separation between UI logic, visualization, audio processing, and shaders.

---

## Key Components Deep Dive

### 1. `index.tsx` - Main Application Component

**File**: `/home/user/Orb/index.tsx`
**Custom Element**: `<gdm-live-audio>`
**Lines**: 415

**Responsibilities**:
- Orchestrates entire application lifecycle
- Manages Google Gemini Live Audio session
- Handles microphone input via Web Audio API
- Processes bidirectional audio streaming
- Maintains transcription log
- Provides UI controls (start/stop, language selection, reset)

**Key State Properties** (Lit `@state`):
- `isRecording` - Session active state
- `transcriptionLog` - Array of {type, text} conversation history
- `currentInputText` - Accumulating user transcription
- `currentOutputText` - Accumulating AI transcription
- `selectedLanguage` - Translation target language

**Important Methods**:
- `initSession()` - Creates Gemini Live connection, sets up event handlers
- `sendAudio(data)` - Encodes and sends PCM audio to Gemini
- `playAudio(data)` - Decodes and plays Gemini audio response
- `stopRecording()` - Cleans up session, stops audio nodes

**Audio Configuration**:
- Input: 16kHz sample rate (required by Gemini)
- Output: 24kHz sample rate (Gemini response format)
- Buffer size: 4096 samples for ScriptProcessorNode
- Format: 16-bit PCM (Int16Array)

**Critical Dependencies**:
- `@google/genai` for LiveAPIClient
- Web Audio API (AudioContext, ScriptProcessorNode, GainNode)
- `./visual-3d` for visualization component

### 2. `visual-3d.ts` - 3D Visualization Component

**File**: `/home/user/Orb/visual-3d.ts`
**Custom Element**: `<gdm-live-audio-visuals-3d>`
**Lines**: 246

**Responsibilities**:
- Renders animated 3D orb (icosahedron sphere)
- Creates post-processing effects (bloom, FXAA)
- Loads HDR environment mapping
- Animates based on audio frequency data
- Manages Three.js scene, camera, renderer

**Visualization Features**:
- **Sphere Deformation**: Custom vertex shader displaces vertices based on audio
- **Dynamic Scaling**: Sphere size reacts to output audio amplitude
- **Rotation**: Both input and output audio influence rotation speed
- **Camera Animation**: Orbits around sphere reactively
- **Bloom Effect**: Creates ethereal glow around orb

**Key Properties**:
- `inputNode` - Audio source for user microphone
- `outputNode` - Audio source for AI responses
- `analyserInput` / `analyserOutput` - Frequency analyzers

**Rendering Loop**:
- Uses `requestAnimationFrame` for 60fps rendering
- Delta time calculated for frame-rate independent animation
- Updates sphere scale, rotation, camera position each frame
- Renders bloom pass then final composite

**Shader Integration**:
- Imports vertex shader from `sphere-shader.ts`
- Uses `material.onBeforeCompile` to inject custom shader code
- Passes uniforms for audio reactivity (`uScale`, `uTime`, etc.)

### 3. `analyser.ts` - Audio Frequency Analyzer

**File**: `/home/user/Orb/analyser.ts`
**Lines**: 20

**Responsibilities**:
- Wraps Web Audio API's AnalyserNode
- Extracts frequency data from audio streams
- Provides byte frequency data array

**Configuration**:
- FFT size: 32 (results in 16 frequency bins)
- Returns Uint8Array of frequency magnitudes (0-255)

**Usage Pattern**:
```typescript
const analyser = new Analyser(audioContext);
analyser.node = gainNode; // Connect to audio node
// In animation loop:
analyser.update();
const freqData = analyser.byteFrequencyData; // Uint8Array[16]
```

### 4. `utils.ts` - Audio Encoding Utilities

**File**: `/home/user/Orb/utils.ts`
**Lines**: 52

**Core Functions**:

| Function | Purpose | Input | Output |
|----------|---------|-------|--------|
| `createBlob(data)` | Convert PCM to Gemini format | Float32Array | base64 string |
| `decode(str)` | Decode base64 | string | Uint8Array |
| `encode(arr)` | Encode to base64 | Uint8Array | string |
| `decodeAudioData(data, ctx)` | Convert Gemini audio to playable | base64 string | AudioBuffer |

**Audio Format Conversions**:
- Gemini expects: 16-bit PCM, base64-encoded
- Web Audio uses: Float32Array (-1.0 to 1.0)
- Conversion: Float32 → Int16 (multiply by 32767, clamp) → base64

### 5. Shader Files

#### `backdrop-shader.ts`
**File**: `/home/user/Orb/backdrop-shader.ts`
**Lines**: 26

**Purpose**: Creates animated gradient background
**Technique**: GLSL3 vertex + fragment shaders
**Visual Effect**: Radial gradient with subtle animated noise

#### `sphere-shader.ts`
**File**: `/home/user/Orb/sphere-shader.ts`
**Lines**: 73

**Purpose**: Deforms orb vertices based on audio
**Technique**: Vertex displacement using spherical coordinates
**Visual Effect**: Organic, pulsating sphere surface
**Integration**: Injected into Three.js material via `onBeforeCompile`

---

## Development Workflows

### Initial Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
# Create .env.local file with:
GEMINI_API_KEY=your_api_key_here

# 3. Start development server
npm run dev
# Access at http://localhost:3000
```

### Development Cycle

1. **Hot Module Replacement**: Vite provides instant updates on file changes
2. **TypeScript Compilation**: Happens automatically via Vite
3. **Browser Console**: Check for audio permission issues, API errors
4. **Testing Audio**: Requires user interaction (click start) due to browser autoplay policies

### Build & Deploy

```bash
# Production build
npm run build
# Output: dist/ directory

# Preview production build
npm run preview
```

### AI Studio Deployment

The app is designed for AI Studio deployment:
- View in AI Studio: https://ai.studio/apps/drive/1GB_xnD6NSdY0QfcD1vAVVYgg2gX_oKwP
- Metadata in `metadata.json` specifies required permissions
- Import maps in `index.html` use CDN dependencies for browser-direct loading

---

## Coding Conventions & Patterns

### TypeScript Patterns

**Web Components with Lit**:
```typescript
@customElement('component-name')
export class ComponentName extends LitElement {
  @state() private reactiveState: string = '';
  @property() public publicProp: number = 0;

  render() {
    return html`<div>${this.reactiveState}</div>`;
  }
}
```

**Decorators Used**:
- `@customElement()` - Registers custom element
- `@state()` - Creates reactive internal state
- `@property()` - Creates reactive public property

**Key TypeScript Settings**:
- `experimentalDecorators: true` - Required for Lit
- `useDefineForClassFields: false` - Required for decorators to work
- Path alias: `@/*` maps to project root

### Naming Conventions

- **Components**: PascalCase (`GdmLiveAudio`)
- **Custom Elements**: kebab-case (`gdm-live-audio`)
- **Methods**: camelCase (`initSession`)
- **Private Methods**: prefixed with `private`
- **Constants**: UPPERCASE for shader strings
- **Files**: kebab-case.ts

### Code Organization Principles

1. **Separation of Concerns**: Logic, visualization, and audio processing are separate
2. **Composition Over Inheritance**: Main component composes visualization component
3. **Reactive State Management**: Use `@state` for automatic re-rendering
4. **Event-Driven**: Callback-based API integration (onopen, onmessage, etc.)
5. **Modular Shaders**: GLSL code in separate files, imported as strings

### Licensing

All source files include Apache 2.0 license headers:
```typescript
/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0
 * ...
 */
```

**Important**: Maintain license headers when creating new files.

---

## Common Development Tasks

### Task: Add a New Language

**Files to Modify**: `index.tsx`

1. Add language to the `languages` array:
```typescript
const languages = [
  // ... existing languages
  { code: 'xy', name: 'New Language' }
];
```

2. No other changes needed - translation handled by Gemini

### Task: Modify Visual Effects

**Files to Modify**: `visual-3d.ts`, potentially shader files

**For scaling/rotation behavior**:
- Edit `animate()` method in `visual-3d.ts:178-240`
- Adjust calculations using `freqSum` and `freqOut`

**For sphere appearance**:
- Edit `sphere-shader.ts` vertex shader
- Modify displacement calculations or uniforms

**For bloom intensity**:
- Edit `bloomPass` parameters in `visual-3d.ts:129`
- Adjust `strength`, `radius`, or `threshold`

### Task: Change Audio Quality

**Files to Modify**: `index.tsx`

**Sample rates** (line 63-64):
```typescript
private inputContext = new AudioContext({ sampleRate: 16000 }); // Gemini requirement
private outputContext = new AudioContext({ sampleRate: 24000 }); // Gemini output
```

**WARNING**: Do NOT change input sample rate - Gemini requires 16kHz.

**Buffer size** (line 155):
```typescript
const processor = this.inputContext.createScriptProcessor(4096, 1, 1);
```
- Smaller = lower latency, higher CPU
- Larger = higher latency, lower CPU

### Task: Modify System Instructions

**Files to Modify**: `index.tsx`

Edit `initSession()` method around line 104:
```typescript
systemInstruction: {
  parts: [
    {
      text: `Your new instructions here. Language: ${this.selectedLanguage}`
    },
  ],
},
```

**Current behavior**:
- If language is "None": Acts as "parrot mode" (repeats user)
- Otherwise: Translates user speech to target language

### Task: Add Transcription Export

**Files to Modify**: `index.tsx`

The transcription log is available as:
```typescript
this.transcriptionLog: Array<{type: 'input'|'output', text: string}>
```

**Approach**:
1. Add export button to UI in `render()` method
2. Create method to format and download transcription:
```typescript
private exportTranscription() {
  const text = this.transcriptionLog
    .map(t => `[${t.type.toUpperCase()}]: ${t.text}`)
    .join('\n\n');

  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'transcription.txt';
  a.click();
}
```

### Task: Debug Audio Issues

**Common Issues**:

1. **No microphone access**:
   - Check browser permissions
   - Ensure HTTPS (required for getUserMedia)
   - Check console for permission errors

2. **No audio output**:
   - Verify `GEMINI_API_KEY` is set correctly
   - Check network tab for API errors
   - Ensure speakers/headphones connected

3. **Choppy audio**:
   - May be network latency
   - Check `audioQueue` buffer length in `playAudio()` (line 185-200)
   - Adjust queue management logic

4. **Echo/feedback**:
   - Use headphones (microphone picking up speakers)
   - Not a code issue

**Debugging Tools**:
```typescript
// Add logging to sendAudio method
console.log('Sending audio chunk:', data.length);

// Add logging to playAudio method
console.log('Received audio chunk:', data.length);
console.log('Audio queue size:', this.audioQueue.length);
```

---

## Important Constraints & Considerations

### Browser Compatibility

**Web Audio API**:
- Uses `ScriptProcessorNode` (deprecated but widely supported)
- Future migration should use `AudioWorklet`
- Safari needs `webkitAudioContext` fallback (noted in code comments)

**Media Permissions**:
- Requires HTTPS in production
- User must interact before audio plays (autoplay policy)
- Microphone permission must be granted

**WebGL**:
- Requires hardware acceleration enabled
- May fail on old mobile devices

### Performance Considerations

**Audio Processing**:
- Runs in real-time (must process 4096 samples every ~85ms at 48kHz)
- Keep `onaudioprocess` callback lightweight
- Avoid complex calculations in audio thread

**3D Rendering**:
- Animation loop runs at 60fps target
- Each frame: update analyzers, animate objects, render scene
- Keep shader calculations efficient
- Consider device capabilities (mobile may struggle)

**Memory Management**:
- Audio buffers accumulate (see `audioQueue`)
- Clear transcription log periodically if needed
- HDR texture is 3.3MB (loaded once, cached)

### API Constraints

**Google Gemini Live Audio**:
- Model: `gemini-2.5-flash-native-audio-preview-09-2025`
- Requires API key (never commit to version control)
- Input: 16kHz, 16-bit PCM, mono
- Output: 24kHz, 16-bit PCM, mono
- Rate limits apply (check Google Cloud console)

**WebSocket Connection**:
- Managed by `@google/genai` SDK
- Can disconnect unexpectedly (network issues)
- Reconnection not currently implemented - requires page refresh

### Security Considerations

**API Key Handling**:
- Must be stored in environment variables
- Never commit `.env.local` to git
- Vite injects at build time as `process.env.API_KEY`
- Consider using proxy server for production to hide key

**User Privacy**:
- Audio is sent to Google's servers
- No local recording/storage currently implemented
- Transcriptions stored in memory only (lost on refresh)
- Consider adding privacy notice in UI

**CORS & CSP**:
- Import maps use esm.sh CDN
- May need CSP headers for production deployment
- Ensure API endpoints allow origin

---

## Testing Strategy

**Current State**: No automated tests configured

**Recommended Testing Approach**:

1. **Manual Testing Checklist**:
   - [ ] Start session with microphone permission
   - [ ] Verify audio visualization responds to microphone
   - [ ] Speak and confirm transcription appears
   - [ ] Verify AI responds audibly
   - [ ] Check AI response transcription
   - [ ] Test each supported language
   - [ ] Test stop/start cycle
   - [ ] Test reset functionality
   - [ ] Verify 3D orb animations

2. **Browser Testing**:
   - Chrome (primary)
   - Safari (webkit quirks)
   - Firefox (secondary)
   - Mobile browsers (iOS Safari, Chrome Android)

3. **Future Automated Testing**:
   - Consider Playwright for E2E tests
   - Mock Gemini API responses for consistent testing
   - Test audio processing with synthetic audio
   - Visual regression testing for 3D rendering

---

## Troubleshooting Guide

### Build Errors

**"Cannot find module '@/...'"**:
- Check `vite.config.ts` and `tsconfig.json` path aliases match
- Ensure imports use `@/` prefix correctly

**"Experimental decorators"**:
- Verify `experimentalDecorators: true` in `tsconfig.json`
- Verify `useDefineForClassFields: false`

**"Module not found: lit"**:
- Run `npm install`
- Check `package.json` dependencies are correct

### Runtime Errors

**"Failed to get user media"**:
- Microphone permission denied or unavailable
- Must use HTTPS (or localhost)
- Check browser compatibility

**"WebSocket connection failed"**:
- Invalid `GEMINI_API_KEY`
- Network connectivity issues
- API quota exceeded

**"AudioContext suspended"**:
- Browser autoplay policy blocking
- Requires user interaction before audio plays
- Call `audioContext.resume()` after user gesture

**"WebGL context lost"**:
- GPU crashed or overloaded
- Too many WebGL contexts created
- Dispose old contexts before creating new ones

### Visual Issues

**Orb not appearing**:
- Check console for WebGL errors
- Verify `piz_compressed.exr` exists in `/public`
- Check if hardware acceleration is enabled

**No audio-reactive animation**:
- Verify analyser nodes connected to gain nodes
- Check `inputNode` and `outputNode` setters called
- Add console.log to verify frequency data updating

**Poor performance**:
- Reduce bloom effect strength/quality
- Lower resolution (check renderer size calculation)
- Simplify shader calculations

---

## AI Assistant Best Practices

### When Modifying Code

1. **Read Before Writing**: Always read existing file before editing
2. **Preserve Patterns**: Follow established Lit/TypeScript conventions
3. **Maintain Licenses**: Keep Apache 2.0 headers intact
4. **Test Locally**: Recommend user test with `npm run dev`
5. **Check Dependencies**: Verify imports match actual dependencies

### When Adding Features

1. **Consider Audio Pipeline**: New features may need audio context awareness
2. **State Management**: Use `@state` for reactive updates
3. **Component Boundaries**: Keep visualization separate from logic
4. **Performance**: Audio runs in real-time - avoid heavy processing
5. **Browser Compatibility**: Test cross-browser, especially Safari

### When Debugging

1. **Check Console First**: Most errors visible in browser console
2. **Verify Environment**: Is `GEMINI_API_KEY` set correctly?
3. **Test Microphone**: Use browser's built-in mic test
4. **Isolate Components**: Test audio, visualization, API separately
5. **Network Tab**: Check WebSocket connection, API calls

### When Explaining Code

1. **Reference Line Numbers**: Use format `file.ts:123`
2. **Explain Audio Concepts**: Many devs unfamiliar with Web Audio API
3. **Link Flows**: Show how data moves through system
4. **Provide Context**: Explain why certain patterns used (e.g., sample rates)
5. **Highlight Constraints**: Mention Gemini API requirements, browser policies

### Communication Guidelines

1. **Be Precise**: Audio/3D code is complex - avoid ambiguity
2. **Provide Examples**: Show code snippets for clarity
3. **Warn of Risks**: Flag potential breaking changes
4. **Suggest Testing**: Always recommend testing after changes
5. **Explain Trade-offs**: Performance vs. quality, latency vs. buffer size

---

## Additional Resources

### External Documentation

- **Lit**: https://lit.dev/docs/
- **Three.js**: https://threejs.org/docs/
- **Web Audio API**: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API
- **Google Gemini API**: https://ai.google.dev/gemini-api/docs
- **Vite**: https://vitejs.dev/guide/

### Key Concepts to Understand

- **Web Components**: Custom HTML elements with encapsulated functionality
- **Shadow DOM**: Isolated DOM and CSS scoping
- **Web Audio Graph**: Chain of audio nodes processing sound
- **PCM Audio**: Pulse Code Modulation - raw audio samples
- **WebGL Shaders**: GPU programs for 3D rendering
- **GLSL**: OpenGL Shading Language for vertex/fragment shaders

### Project-Specific Knowledge

- **Gemini Live Audio**: Real-time bidirectional audio AI streaming
- **ScriptProcessorNode**: Legacy but functional audio processing callback
- **Import Maps**: Browser-native module resolution (alternative to bundling)
- **HDR Environment Maps**: High dynamic range images for realistic lighting

---

## Appendix: File Reference

### Complete File Manifest

| File | Lines | Purpose | Key Exports |
|------|-------|---------|-------------|
| `index.tsx` | 415 | Main app component | `GdmLiveAudio` |
| `visual-3d.ts` | 246 | 3D visualization | `GdmLiveAudioVisuals3D` |
| `visual.ts` | 103 | 2D visualization (unused) | `GdmLiveAudioVisuals` |
| `analyser.ts` | 20 | Audio frequency analyzer | `Analyser` |
| `utils.ts` | 52 | Audio encoding utilities | `createBlob`, `decode`, `encode`, `decodeAudioData` |
| `backdrop-shader.ts` | 26 | Background GLSL shader | `BACKDROP_VERTEX_SHADER`, `BACKDROP_FRAGMENT_SHADER` |
| `sphere-shader.ts` | 73 | Orb deformation shader | `SPHERE_VERTEX_SHADER` |
| `vite.config.ts` | 17 | Vite configuration | (config object) |
| `index.html` | 19 | HTML entry point | - |
| `index.css` | 3 | Global styles | - |
| `package.json` | 24 | Project manifest | - |
| `tsconfig.json` | 29 | TypeScript config | - |
| `metadata.json` | 7 | AI Studio metadata | - |

### Important Constants

```typescript
// Audio Configuration
INPUT_SAMPLE_RATE = 16000   // Gemini requirement
OUTPUT_SAMPLE_RATE = 24000  // Gemini response format
BUFFER_SIZE = 4096          // ScriptProcessor buffer
FFT_SIZE = 32               // Analyser FFT (16 bins)

// Gemini Model
MODEL = "gemini-2.5-flash-native-audio-preview-09-2025"

// Dev Server
PORT = 3000
HOST = "0.0.0.0"
```

### State Flow Diagram

```
User Microphone
       ↓
MediaStream → SourceNode → GainNode → Analyser (visualization)
       ↓                        ↓
ScriptProcessor          Visual-3D Component
       ↓                        ↓
Float32 → Int16 → Base64    Frequency Data → Shader Uniforms
       ↓                        ↓
Gemini API                 Sphere Deformation + Animation
       ↓                        ↓
WebSocket Response         60fps Render Loop
       ↓
Base64 → Int16 → AudioBuffer
       ↓
BufferSource → GainNode → Analyser (visualization) → Speakers
```

---

## Version History

- **v0.0.0** (Current): Initial development version
  - Live audio transcription and response
  - 3D audio-reactive visualization
  - Multi-language support
  - Basic UI controls

---

## Contributing Guidelines

When contributing to this codebase:

1. **Follow Existing Patterns**: Use Lit decorators, TypeScript types
2. **Test Audio Features**: Manually verify microphone and playback
3. **Maintain Performance**: Keep 60fps rendering and real-time audio
4. **Document Changes**: Update this CLAUDE.md if architecture changes
5. **License Headers**: Include Apache 2.0 license in new files
6. **Environment Variables**: Never commit API keys or secrets
7. **Browser Compatibility**: Test on Chrome, Safari, Firefox

---

**End of CLAUDE.md**

For questions or clarifications about this codebase, refer to the component deep dives above or examine the source files directly with line number references provided throughout this guide.
