'use client';

import { useEffect, useMemo, useState } from 'react';
import Vapi from '@vapi-ai/web';

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

  const vapi = useMemo(() => {
    const key = process.env.NEXT_PUBLIC_VAPI_API_KEY;
    if (!key) return null;
    return new Vapi(key);
  }, []);

  useEffect(() => {
    fetch('/api/providers')
      .then((res) => res.json())
      .then((data) => {
        console.log('providers:', data);
        setProviders(Array.isArray(data) ? data : []);
      })
      .catch((error) => {
        console.error('providers fetch error:', error);
      });
  }, []);

  useEffect(() => {
    if (!selectedProvider) {
      setSlots([]);
      return;
    }

    fetch(`/api/slots?providerId=${selectedProvider}`)
      .then((res) => res.json())
      .then((data) => {
        console.log('slots:', data);
        setSlots(data);
      })
      .catch((error) => {
        console.error('slots fetch error:', error);
      });
  }, [selectedProvider]);

  useEffect(() => {
    if (!vapi) return;

    const onCallStart = () => {
      console.log('Vapi call started');
      setCallStatus('🎤 Call in progress...');
    };

    const onCallEnd = () => {
      console.log('Vapi call ended');
      setCallStatus('Call ended');
    };

    const onMessage = (message: any) => {
      console.log('Vapi message:', message);

      // Auto-fill form when assistant calls book_appointment tool
      if (message.type === 'tool-calls') {
        const toolCall = message.toolCallList?.[0];
        if (toolCall?.function?.name === 'book_appointment') {
          const args = toolCall.function.arguments;
          if (args.firstName) setFirstName(args.firstName);
          if (args.lastName) setLastName(args.lastName);
          if (args.email) setEmail(args.email);
          if (args.reason) setReason(args.reason);
          if (args.providerId) setSelectedProvider(args.providerId);
        }
      }

      // Also catch function-call format
      if (message.type === 'function-call') {
        const { functionCall } = message;
        if (functionCall?.name === 'book_appointment') {
          const params = functionCall.parameters || {};
          if (params.firstName) setFirstName(params.firstName);
          if (params.lastName) setLastName(params.lastName);
          if (params.email) setEmail(params.email);
          if (params.reason) setReason(params.reason);
          if (params.providerId) setSelectedProvider(params.providerId);
        }
      }

      // Extract email from assistant transcript in real time
      if (message.type === 'transcript' && message.role === 'assistant') {
        const emailMatch = message.transcript?.match(
          /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
        );
        if (emailMatch) setEmail(emailMatch[0]);
      }
    };

    const onError = (error: unknown) => {
      console.error('Vapi error:', error);
      setCallStatus('Call error');
      alert('Voice call failed. Check console.');
    };

    vapi.on('call-start', onCallStart);
    vapi.on('call-end', onCallEnd);
    vapi.on('message', onMessage);
    vapi.on('error', onError);

    return () => {
      vapi.off('call-start', onCallStart);
      vapi.off('call-end', onCallEnd);
      vapi.off('message', onMessage);
      vapi.off('error', onError);
    };
  }, [vapi]);

  const selectedProviderName =
    providers.find((p) => p.id === selectedProvider)?.name || '';

  const startVoiceAssistant = async () => {
    if (!vapi) {
      alert('Vapi key is missing in .env.local');
      return;
    }

    try {
      setCallStatus('Starting call...');

      await vapi.start('eb734837-de2b-4072-b054-5d341192f462', {
        variableValues: {
          patient_name: `${firstName} ${lastName}`.trim() || 'Patient',
          email: email || 'not provided',
          reason_for_visit: reason || 'not provided',
          matched_provider: selectedProviderName || 'not selected',
          previous_chat_summary: `Patient name: ${firstName} ${lastName}. Reason: ${reason}. Selected provider: ${selectedProviderName}.`,
        },
      });
    } catch (error) {
      console.error('Error starting Vapi:', error);
      setCallStatus('Call error');
      alert('Could not start voice assistant.');
    }
  };

  const stopVoiceAssistant = async () => {
    if (!vapi) return;

    try {
      await vapi.stop();
      setCallStatus('Call stopped');
    } catch (error) {
      console.error('Error stopping Vapi:', error);
    }
  };

  return (
    <main style={{ padding: '40px', fontFamily: 'Arial' }}>
      <h1>Clinic AI</h1>

      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={startVoiceAssistant}
          style={{
            padding: '10px 16px',
            marginRight: '10px',
            cursor: 'pointer',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '16px',
          }}
        >
          🎤 Talk to Assistant
        </button>

        <button
          onClick={stopVoiceAssistant}
          style={{
            padding: '10px 16px',
            cursor: 'pointer',
            backgroundColor: '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '16px',
          }}
        >
          ⏹ Stop Call
        </button>

        <p style={{ marginTop: '10px' }}>
          <strong>Voice status:</strong> {callStatus}
        </p>
      </div>

      <h2>Patient Info</h2>
      <p style={{ color: '#888', fontSize: '13px', marginBottom: '10px' }}>
        Fields auto-fill as the assistant collects your information.
      </p>
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
          style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', minWidth: '150px' }}
        />

        <input
          placeholder="Last Name"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', minWidth: '150px' }}
        />

        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', minWidth: '200px' }}
        />

        <input
          placeholder="Reason for visit"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', minWidth: '200px' }}
        />
      </div>

      <label><strong>Select Provider: </strong></label>
      <select
        value={selectedProvider}
        onChange={(e) => setSelectedProvider(e.target.value)}
        style={{ marginLeft: '10px', padding: '8px', borderRadius: '4px' }}
      >
        <option value="">-- Select Doctor --</option>
        {providers.map((provider) => (
          <option key={provider.id} value={provider.id}>
            {provider.name} ({provider.specialty})
          </option>
        ))}
      </select>

      <div style={{ marginTop: '30px' }}>
        <h2>Available Slots</h2>
        {slots.length === 0 ? (
          <p>No slots yet. Select a provider to see availability.</p>
        ) : (
          <ul>
            {slots.map((slot) => (
              <li key={slot.id} style={{ marginBottom: '10px' }}>
                {new Date(slot.slot_time).toLocaleString()}

                <button
                  style={{
                    marginLeft: '10px',
                    padding: '5px 10px',
                    backgroundColor: '#2196F3',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                  onClick={async () => {
                    if (!firstName || !lastName || !email || !reason) {
                      alert('Please fill all patient fields first');
                      return;
                    }

                    try {
                      const bookRes = await fetch('/api/book', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          firstName,
                          lastName,
                          email,
                          providerId: selectedProvider,
                          slotId: slot.id,
                          reason,
                        }),
                      });

                      const bookText = await bookRes.text();
                      console.log('raw booking response:', bookText);

                      let bookData: any = {};
                      if (bookText) bookData = JSON.parse(bookText);

                      if (!bookRes.ok) {
                        alert(bookData.error || 'Booking failed');
                        return;
                      }

                      const emailRes = await fetch('/api/send-email', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          email,
                          name: `${firstName} ${lastName}`,
                          provider: selectedProviderName,
                          time: new Date(slot.slot_time).toLocaleString(),
                        }),
                      });

                      const emailText = await emailRes.text();
                      console.log('raw email response:', emailText);

                      let emailData: any = {};
                      if (emailText) emailData = JSON.parse(emailText);

                      if (!emailRes.ok) {
                        alert('Appointment booked, but email could only be sent to your verified test email in Resend.');
                      } else {
                        alert('✅ Appointment booked! Confirmation email sent.');
                      }

                      const updatedSlotsRes = await fetch(
                        `/api/slots?providerId=${selectedProvider}`
                      );
                      const updatedSlots = await updatedSlotsRes.json();
                      setSlots(updatedSlots);
                    } catch (error) {
                      console.error('Booking flow error:', error);
                      alert('Something went wrong. Check browser console and terminal.');
                    }
                  }}
                >
                  Book
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}