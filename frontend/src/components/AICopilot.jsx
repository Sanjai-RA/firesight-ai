import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, X, Send, Mic, Sparkles, MapPin, Minimize2 } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function AICopilot({ params, onActionTriggered }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Hello! I am FireSight Copilot. How can I assist with the simulation today?' }
  ]);
  const [inputStr, setInputStr] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  
  const messagesEndRef = useRef(null);
  
  // Voice Recognition Setup
  const recognitionRef = useRef(null);
  
  useEffect(() => {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      
      recognitionRef.current.onresult = (event) => {
        const text = event.results[0][0].transcript;
        setInputStr(text);
        setIsListening(false);
        handleSend(text);
      };
      
      recognitionRef.current.onerror = (event) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
      };
      
      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (e) {
        console.error("Mic error", e);
      }
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = async (textToProcess) => {
    const text = typeof textToProcess === 'string' ? textToProcess : inputStr;
    if (!text.trim()) return;

    // Add user message
    const newMessages = [...messages, { role: 'user', text }];
    setMessages(newMessages);
    setInputStr('');
    setIsTyping(true);

    try {
      const response = await fetch(`${API_URL}/assistant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, context: params })
      });
      const data = await response.json();
      
      setIsTyping(false);
      setMessages(prev => [...prev, { role: 'assistant', text: data.message }]);
      
      if (data.action) {
        setTimeout(() => {
          onActionTriggered(data.action, data.mapHighlight);
        }, 1000);
      }
    } catch (err) {
      console.error("Copilot backend connection failed, falling back to local simulation mode:", err);
      
      // Fallback local logic for demo/offline purposes
      let action = null;
      let mapHighlight = null;
      let responseText = "Agent Online [Offline Mode]. Monitoring wind vectors...";
      const t = text.toLowerCase();

      const riskLevel = params.windSpeed > 45 || params.temperature > 35 || params.humidity < 10
        ? 'CRITICAL' 
        : params.windSpeed > 25 || params.temperature > 30 || params.humidity < 20
          ? 'HIGH' 
          : 'MODERATE';

      if (t.includes('predict') || t.includes('spread') || t.includes('forecast')) {
        responseText = `Predicted spread trajectory plotted based on current ${params.windSpeed || 20}km/h wind speeds. Escort perimeters highlighted.`;
        action = 'predict';
      } else if (t.includes('optim') || t.includes('resource') || t.includes('asset') || t.includes('deploy')) {
        responseText = `Simulating resource reallocation. Redirecting air tankers to the active front. Optimizing ground payload.`;
        action = 'optimize';
      } else if (t.includes('hotspot') || t.includes('risk') || t.includes('zone') || t.includes('danger')) {
        responseText = `The current fire risk level is ${riskLevel}. Locating high-risk focal points based on terrain and weather telemetry (${params.temperature}°C, ${params.humidity}%). Check map for details.`;
        action = 'highlight';
        mapHighlight = { 
          lat: params.baseLat ? (params.baseLat + 0.01) : 37.7749, 
          lng: params.baseLng ? (params.baseLng + 0.01) : -122.4194 
        };
      } else if (t.includes('evacuat') || t.includes('escape') || t.includes('route') || t.includes('safe')) {
        responseText = `Evacuation routes formulated. Move perpendicular to the ${params.windDir}° wind vector to minimize exposure.`;
      } else if (t.includes('weather') || t.includes('temp') || t.includes('wind') || t.includes('humid') || t.includes('status')) {
        responseText = `Current conditions: ${params.temperature}°C with ${params.humidity}% humidity, driven by ${params.windSpeed} km/h winds at a ${params.windDir}° bearing. Risk level is ${riskLevel}.`;
      } else if (t.includes('hello') || t.includes('hi') || t.includes('hey')) {
        responseText = `Hello! I'm FireSight Copilot. You can ask me to predict spread, optimize resources, check weather, or find hotspots.`;
      } else {
        responseText = `I'm monitoring the ${riskLevel} situation. Try asking: "Predict fire spread", "Optimize resources", "Show fire risk", or "What are the evacuation routes?"`;
      }

      setIsTyping(false);
      setMessages(prev => [...prev, { role: 'assistant', text: responseText }]);
      
      if (action) {
        setTimeout(() => {
          onActionTriggered(action, mapHighlight);
        }, 1000);
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  const suggestions = [
    { label: "Predict Spread", action: "Predict Fire Spread" },
    { label: "Optimize Assets", action: "Optimize Resources" },
    { label: "Find Hotspots", action: "Show high-risk zones" }
  ];

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-fire-500 text-white shadow-[0_0_20px_rgba(255,69,0,0.5)] flex items-center justify-center z-50 hover:bg-fire-400 transition-colors"
          >
            <Bot className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ y: 50, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 50, opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", bounce: 0.3, duration: 0.5 }}
            className="fixed bottom-6 right-6 w-[380px] h-[600px] max-h-[80vh] glass-panel flex flex-col z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="h-16 border-b border-white/10 flex items-center justify-between px-5 bg-dark-900/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-fire-500/20 text-fire-500 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">FireSight Copilot</h3>
                  <div className="text-[10px] text-green-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> Online
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div 
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                      msg.role === 'user' 
                        ? 'bg-fire-500 text-white rounded-br-none shadow-[0_4px_10px_rgba(255,69,0,0.2)]' 
                        : 'bg-dark-800 text-gray-200 border border-white/5 rounded-bl-none'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-dark-800 border border-white/5 rounded-2xl rounded-bl-none px-4 py-3 flex gap-1 items-center">
                    <motion.div className="w-1.5 h-1.5 rounded-full bg-fire-500" animate={{ y: [0,-5,0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} />
                    <motion.div className="w-1.5 h-1.5 rounded-full bg-fire-500" animate={{ y: [0,-5,0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} />
                    <motion.div className="w-1.5 h-1.5 rounded-full bg-fire-500" animate={{ y: [0,-5,0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Smart Suggestions */}
            <div className="px-4 pb-2 flex gap-2 overflow-x-auto no-scrollbar">
              {suggestions.map((sug, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(sug.action)}
                  className="whitespace-nowrap px-3 py-1.5 rounded-full bg-dark-700 hover:bg-dark-600 border border-white/10 text-xs font-medium text-gray-300 transition-colors"
                >
                  {sug.label}
                </button>
              ))}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-dark-900/50 border-t border-white/5 flex gap-2 items-center">
              <button 
                onClick={toggleListening}
                className={`p-2.5 rounded-full transition-colors flex-shrink-0 ${
                  isListening ? 'bg-red-500/20 text-red-500 animate-pulse' : 'hover:bg-white/5 text-gray-400'
                }`}
              >
                <Mic className="w-5 h-5" />
              </button>
              
              <input
                type="text"
                value={inputStr}
                onChange={(e) => setInputStr(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask Copilot..."
                className="flex-1 bg-dark-800 border-none outline-none rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:ring-1 focus:ring-fire-500/50 transition-shadow"
              />
              
              <button 
                onClick={() => handleSend()}
                disabled={!inputStr.trim()}
                className="p-2.5 bg-fire-500 disabled:bg-fire-500/50 hover:bg-fire-400 text-white rounded-full transition-all disabled:cursor-not-allowed flex-shrink-0"
              >
                <Send className="w-4 h-4 ml-0.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
