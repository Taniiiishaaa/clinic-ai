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
        setProviders(data);
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
      setCallStatus('Call started');
    };

    const onCallEnd = () => {
      console.log('Vapi call ended');
      setCallStatus('Call ended');
    };

    const onMessage = (message: unknown) => {
      console.log('Vapi message:', message);
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
      <p>Test page is loading.</p>

      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={startVoiceAssistant}
          style={{
            padding: '10px 16px',
            marginRight: '10px',
            cursor: 'pointer',
          }}
        >
          🎤 Talk to Assistant
        </button>

        <button
          onClick={stopVoiceAssistant}
          style={{
            padding: '10px 16px',
            cursor: 'pointer',
          }}
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
        {providers.map((provider) => (
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

                <button
                  style={{ marginLeft: '10px', padding: '5px 10px' }}
                  onClick={async () => {
                    if (!firstName || !lastName || !email || !reason) {
                      alert('Please fill all fields');
                      return;
                    }

                    try {
                      const bookRes = await fetch('/api/book', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
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
                      if (bookText) {
                        bookData = JSON.parse(bookText);
                      }

                      if (!bookRes.ok) {
                        alert(bookData.error || 'Booking failed');
                        return;
                      }

                      const emailRes = await fetch('/api/send-email', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
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
                      if (emailText) {
                        emailData = JSON.parse(emailText);
                      }

                      if (!emailRes.ok) {
                        alert(
                          'Appointment booked, but email could only be sent to your verified test email in Resend.'
                        );
                      } else {
                        alert('Appointment booked! Email sent.');
                      }

                      const updatedSlotsRes = await fetch(
                        `/api/slots?providerId=${selectedProvider}`
                      );
                      const updatedSlots = await updatedSlotsRes.json();
                      setSlots(updatedSlots);
                    } catch (error) {
                      console.error('Booking flow error:', error);
                      alert(
                        'Something went wrong. Check browser console and terminal.'
                      );
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