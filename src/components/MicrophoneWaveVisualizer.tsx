import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Play, Square } from 'lucide-react';

declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}

const MicrophoneWaveVisualizer = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [pitch, setPitch] = useState(0);
  const [isPermissionGranted, setIsPermissionGranted] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);

  const handleToggle = () => {
  if (isRecording) {
    stopRecording();
  } else {
    startRecording();
  }
};


  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });
      
      streamRef.current = stream;
      setIsPermissionGranted(true);
      
      // Create audio context and analyser
      audioContextRef.current = new (
        window.AudioContext ||window.webkitAudioContext
      )();
      analyserRef.current = audioContextRef.current.createAnalyser();
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      
      // Configure analyser for better frequency detection
      analyserRef.current.fftSize = 2048;
      analyserRef.current.smoothingTimeConstant = 0.8;
      
      const bufferLength = analyserRef.current.frequencyBinCount;
      dataArrayRef.current = new Uint8Array(bufferLength);
      
      setIsRecording(true);
        
        analyzeAudio();
      
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    setIsRecording(false);
    setAudioLevel(0);
    setPitch(0);
  };

  const analyzeAudio = () => {
    if (!analyserRef.current || !dataArrayRef.current) return;
    
    // Get frequency data
    analyserRef.current.getByteFrequencyData(dataArrayRef.current);
    
    // Calculate average volume
    const average = dataArrayRef.current.reduce((sum, value) => sum + value, 0) / dataArrayRef.current.length;
    setAudioLevel(average / 255);
    
    // Calculate dominant frequency (pitch)
    let maxIndex = 0;
    let maxValue = 0;
    
    // Focus on human voice frequency range (80Hz - 1000Hz)
    if (!audioContextRef.current) return;
    const startIndex = Math.floor(80 * dataArrayRef.current.length / (audioContextRef.current.sampleRate / 2));
    const endIndex = Math.floor(1000 * dataArrayRef.current.length / (audioContextRef.current.sampleRate / 2));
    
    for (let i = startIndex; i < endIndex && i < dataArrayRef.current.length; i++) {
      if (dataArrayRef.current[i] > maxValue) {
        maxValue = dataArrayRef.current[i];
        maxIndex = i;
      }
    }
    
    // Convert to pitch value (0-1)
    const pitchValue = maxIndex / (endIndex - startIndex);
    setPitch(pitchValue);
    
    animationRef.current = requestAnimationFrame(analyzeAudio);
  };

  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, []);

  // const WaveBar = ({ index, audioLevel, pitch }) => {
  //   const baseHeight = 4;
  //   const maxHeight = 100;
    
  //   // Create wave effect based on position and audio
  //   const waveOffset = Math.sin((index * 0.5) + (Date.now() * 0.01)) * 0.3;
  //   const pitchEffect = Math.sin((index * 0.3) + (pitch * 10)) * 0.4;
    
  //   const height = baseHeight + (audioLevel * maxHeight) * (1 + waveOffset + pitchEffect);
    
  //   return (
  //     <div
  //       className="bg-gradient-to-t from-blue-500 via-purple-500 to-pink-500 rounded-full transition-all duration-75 ease-out"
  //       style={{
  //         width: '4px',
  //         height: `${Math.max(baseHeight, height)}px`,
  //         opacity: 0.7 + (audioLevel * 0.3),
  //       }}
  //     />
  //   );
  // };

  type NeonOrbStyleProps = {
    isActive: boolean;
    volume: number;
    pitch: number;
    onToggle: () => void;
  };

  const NeonOrbStyle = ({ isActive, volume, pitch, onToggle }: NeonOrbStyleProps) => {
  const pulseSize = 1 + (volume + pitch) * 0.3;
  const glowIntensity = (volume + pitch) * 30;

  const getColors = () => {
    if (isActive) return { main: '#1e3a8a', glow: '#1d4ed8', shadow: 'shadow-blue-800/40' };
    return { main: '#666666', glow: '#666666', shadow: 'shadow-gray-500/30' };
  };

  const colors = getColors();

  return (
  <div className="flex flex-col items-center space-y-8">
    <div className="relative">
      {/* Outer Rings */}
      {isActive &&
        [1, 2, 3].map((ring) => (
          <div
            key={ring}
            className="absolute inset-0 rounded-full border-2 animate-ping"
            style={{
              borderColor: colors.glow,
              opacity: 0.3 / ring,
              scale: 1 + ring * 0.2,
              animationDuration: `${2 + ring}s`,
            }}
          />
        ))}

      {/* Main Orb */}
      <div
        className={`w-48 h-48 rounded-full relative ${colors.shadow} shadow-2xl cursor-pointer transition-all duration-300 hover:scale-105`}
        style={{
          transform: `scale(${pulseSize})`,
          background: `radial-gradient(circle, ${colors.main}40, ${colors.main}20, transparent)`,
          boxShadow: `0 0 ${glowIntensity}px ${colors.glow}80, inset 0 0 ${glowIntensity / 2}px ${colors.glow}40`,
        }}
        onClick={onToggle}
      >
        {/* Inner Orb */}
        <div
          className="absolute inset-6 rounded-full"
          style={{
            background: `radial-gradient(circle, ${colors.main}, ${colors.main}80)`,
            boxShadow: `0 0 ${glowIntensity / 2}px ${colors.glow}`,
          }}
        >
          {/* Icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            {isActive ? (
              <Mic className="w-16 h-16 text-white drop-shadow-lg" />
            ) : (
              <MicOff className="w-16 h-16 text-white/60 drop-shadow-lg" />
            )}
          </div>

      </div> 
    </div>
  </div>
  </div>
);

};

  return (
    <div>
        {/* Wave Visualization */}
        {/* <div className="flex items-end justify-center space-x-1 h-32 mb-8 px-4">
          {[...Array(32)].map((_, index) => (
            <WaveBar
              key={index}
              index={index}
              audioLevel={audioLevel}
              pitch={pitch}
            />
        ))}
        </div> */}

        <div className="flex items-center justify-center h-64 mb-8 px-4">
          <NeonOrbStyle
            isActive={isRecording}
            volume={audioLevel}
            pitch={pitch}
            onToggle={handleToggle}
          />
        </div>


        {/* Control Buttons */}
        <div className="flex justify-center space-x-4">
          {!isRecording ? (
            <button
              onClick={()=>{
               
                startRecording()
              }}
              className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-black px-6 py-3 rounded-full font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <Play size={20} />
              <span>Start Recording</span>
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-black px-6 py-3 rounded-full font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <Square size={20} />
              <span>Stop Recording</span>
            </button>
          )}
        </div>

        {/* Status Indicator */}
        <div className="text-center mt-6">
          <div className="flex items-center justify-center space-x-2">
            {isRecording ? (
              <>
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                <span className="text-black font-medium">Recording...</span>
              </>
            ) : (
              <>
                {isPermissionGranted ? (
                  <>
                    <MicOff className="text-black-400" size={16} />
                    <span className="text-black-400">Ready to record</span>
                  </>
                ) : (
                  <>
                    <Mic className="text-black-400" size={16} />
                    <span className="text-black-400">Click start to access microphone</span>
                  </>
                )}
              </>
            )}
          </div>
        </div>
    
    </div>
  );
};

export default MicrophoneWaveVisualizer;

