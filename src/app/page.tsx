'use client';

import { useEffect, useRef, useState } from 'react';

type Provider = {
  id: string;
  name: string;
  specialty: string;
};

type Slot = {
  id: string;
  slot_time: string;
};

export default function Home() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [slots, setSlots] = useState<Slot[]>([]);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');

  const [callStatus, setCallStatus] = useState('Idle');
  const [voiceReady, setVoiceReady] = useState(false);

  const vapiRef = useRef<any>(null);

  useEffect(() => {
    fetch('/api/providers')
      .then(async (res) => {
        const data = await res.json();
        console.log('providers response:', data);

        if (!res.ok) {
          console.error('providers API error:', data);
          setProviders([]);
          return;
        }

        setProviders(Array.isArray(data) ? data : []);
      })
      .catch((error) => {
        console.error('providers fetch error:', error);
        setProviders([]);
      });
  }, []);

  useEffect(() => {
    if (!selectedProvider) {
      setSlots([]);
      return;
    }

    fetch(`/api/slots?providerId=${selectedProvider}`)
      .then(async (res) => {
        const data = await res.json();
        console.log('slots response:', data);

        if (!res.ok) {
          console.error('slots API error:', data);
          setSlots([]);
          return;
        }

        setSlots(Array.isArray(data) ? data : []);
      })
      .catch((error) => {
        console.error('slots fetch error:', error);
        setSlots([]);
      });
  }, [selectedProvider]);

  useEffect(() => {
    let mounted = true;

    const initVapi = async () => {
      try {
        const key = process.env.NEXT_PUBLIC_VAPI_API_KEY;

        if (!key) {
          console.warn('NEXT_PUBLIC_VAPI_API_KEY is missing');
          return;
        }

        const VapiModule = await import('@vapi-ai/web');
        const Vapi = VapiModule.default;
        const instance = new Vapi(key);

        if (!mounted) return;

        vapiRef.current = instance;
        setVoiceReady(true);

        instance.on('call-start', () => setCallStatus('Call started'));
        instance.on('call-end', () => setCallStatus('Call ended'));
        instance.on('message', (message: unknown) =>
          console.log('Vapi message:', message)
        );
        instance.on('error', (error: unknown) => {
          console.error('Vapi error:', error);
          setCallStatus('Call error');
        });
      } catch (error) {
        console.error('Failed to initialize Vapi:', error);
        setVoiceReady(false);
      }
    };

    initVapi();

    return () => {
      mounted = false;
    };
  }, []);

  const selectedProviderName = Array.isArray(providers)
    ? providers.find((p) => p.id === selectedProvider)?.name || ''
    : '';

  const startVoiceAssistant = async () => {
    if (!vapiRef.current) {
      alert('Voice assistant is not ready yet.');
      return;
    }

    try {
      setCallStatus('Starting call...');

      await vapiRef.current.start('eb734837-de2b-4072-b054-5d341192f462', {
        variableValues: {
          patient_name: `${firstName} ${lastName}`.trim() || 'Patient',
          email: email || 'not provided',
          reason_for_visit: reason || 'not provided',
          matched_provider: selectedProviderName || 'not selected',
          previous_chat_summary: `Patient name: ${firstName} ${lastName}. Reason for visit: ${reason}. Selected provider: ${selectedProviderName}.`,
        },
      });
    } catch (error) {
      console.error('Error starting Vapi:', error);
      setCallStatus('Call error');
      alert('Could not start voice assistant.');
    }
  };

  const stopVoiceAssistant = async () => {
    if (!vapiRef.current) return;

    try {
      await vapiRef.current.stop();
      setCallStatus('Call stopped');
    } catch (error) {
      console.error('Error stopping Vapi:', error);
    }
  };

  return (
    <main style={{ padding: '40px', fontFamily: 'Arial' }}>
      <h1>Clinic AI</h1>
      <p>Appointment booking demo</p>

      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={startVoiceAssistant}
          disabled={!voiceReady}
          style={{
            padding: '10px 16px',
            marginRight: '10px',
            cursor: voiceReady ? 'pointer' : 'not-allowed',
            opacity: voiceReady ? 1 : 0.6,
          }}
        >
          🎤 Talk to Assistant
        </button>

        <button
          onClick={stopVoiceAssistant}
          style={{ padding: '10px 16px', cursor: 'pointer' }}
        >
          Stop Call
        </button>

        <p style={{ marginTop: '10px' }}>
          <strong>Voice status:</strong> {callStatus}
        </p>
      </div>

      <h2>Patient Info</h2>
      <div
        style={{
          marginBottom: '20px',
          display: 'flex',
          gap: '10px',
          flexWrap: 'wrap',
        }}
      >
        <input
          placeholder="First Name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          style={{ padding: '8px' }}
        />
        <input
          placeholder="Last Name"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          style={{ padding: '8px' }}
        />
        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ padding: '8px' }}
        />
        <input
          placeholder="Reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          style={{ padding: '8px' }}
        />
      </div>

      <label>Select Provider: </label>
      <select
        value={selectedProvider}
        onChange={(e) => setSelectedProvider(e.target.value)}
        style={{ marginLeft: '10px', padding: '8px' }}
      >
        <option value="">-- Select Doctor --</option>
        {Array.isArray(providers) &&
          providers.map((provider) => (
            <option key={provider.id} value={provider.id}>
              {provider.name} ({provider.specialty})
            </option>
          ))}
      </select>

      <div style={{ marginTop: '30px' }}>
        <h2>Available Slots</h2>
        {slots.length === 0 ? (
          <p>No slots yet.</p>
        ) : (
          <ul>
            {slots.map((slot) => (
              <li key={slot.id} style={{ marginBottom: '10px' }}>
                {new Date(slot.slot_time).toLocaleString()}
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}