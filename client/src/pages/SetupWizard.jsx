import { useState, useEffect } from 'react';

const STEPS = ['Welcome', 'API Token', 'Select Zones', 'Complete'];

function StepIndicator({ current }) {
  return (
    <div className="flex items-center justify-center mb-8">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center">
          <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
            i < current ? 'bg-cf-orange text-white' :
            i === current ? 'bg-cf-orange text-white ring-4 ring-cf-orange/20' :
            'bg-gray-200 text-gray-500'
          }`}>
            {i < current ? '\u2713' : i + 1}
          </div>
          <span className={`ml-2 text-sm hidden sm:inline ${
            i === current ? 'text-gray-900 font-medium' : 'text-gray-500'
          }`}>{label}</span>
          {i < STEPS.length - 1 && (
            <div className={`w-8 sm:w-16 h-0.5 mx-2 ${i < current ? 'bg-cf-orange' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

function WelcomeStep({ onNext }) {
  return (
    <div className="text-center">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Welcome to FlareDDNS</h2>
      <p className="text-gray-600 mb-6">
        FlareDDNS bridges the dyndns2 protocol to Cloudflare DNS. Your router sends standard
        dynamic DNS updates, and FlareDDNS translates them into Cloudflare API calls to keep
        your DNS records up to date.
      </p>
      <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
        <h3 className="font-medium text-gray-900 mb-2">Before you start</h3>
        <p className="text-sm text-gray-600 mb-3">
          You'll need a Cloudflare API token with the following permissions:
        </p>
        <ul className="text-sm text-gray-700 space-y-1">
          <li className="flex items-center">
            <span className="w-2 h-2 bg-cf-orange rounded-full mr-2" />
            <strong>Zone / Zone / Read</strong> — to list your domains
          </li>
          <li className="flex items-center">
            <span className="w-2 h-2 bg-cf-orange rounded-full mr-2" />
            <strong>Zone / DNS / Edit</strong> — to create and update DNS records
          </li>
        </ul>
      </div>
      <button onClick={onNext} className="px-6 py-2 bg-cf-orange text-white rounded-lg hover:bg-cf-orange-dark transition-colors">
        Get Started
      </button>
    </div>
  );
}

function TokenStep({ onNext }) {
  const [token, setToken] = useState('');
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState('');
  const [valid, setValid] = useState(false);

  async function handleValidate() {
    setError('');
    setValidating(true);
    try {
      const res = await fetch('/api/setup/validate-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        setValid(true);
        setTimeout(() => onNext(), 600);
      } else {
        setError(data.errors?.[0]?.message || 'Invalid token');
      }
    } catch {
      setError('Failed to validate token');
    } finally {
      setValidating(false);
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">Cloudflare API Token</h2>
      <p className="text-gray-600 mb-6 text-center">
        Paste your API token below to connect FlareDDNS to your Cloudflare account.
      </p>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">API Token</label>
          <input
            type="password"
            value={token}
            onChange={e => setToken(e.target.value)}
            placeholder="Enter your Cloudflare API token"
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-cf-orange"
          />
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        {valid && <p className="text-green-600 text-sm font-medium">Token validated successfully!</p>}
        <button
          onClick={handleValidate}
          disabled={!token.trim() || validating || valid}
          className="w-full py-2 bg-cf-orange text-white rounded-lg hover:bg-cf-orange-dark transition-colors disabled:opacity-50"
        >
          {validating ? 'Validating...' : valid ? 'Validated!' : 'Validate Token'}
        </button>
      </div>
    </div>
  );
}

function ZoneStep({ onNext, setCompletionData }) {
  const [zones, setZones] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    fetch('/api/setup/zones')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setZones(data);
        } else {
          setError(data.error || 'Failed to load zones');
        }
      })
      .catch(() => setError('Failed to fetch zones'))
      .finally(() => setLoading(false));
  }, []);

  function toggleZone(id) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleComplete() {
    setError('');
    setCompleting(true);
    try {
      const res = await fetch('/api/setup/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zoneIds: [...selected] }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCompletionData(data);
        onNext();
      } else {
        setError(data.error || 'Setup failed');
      }
    } catch {
      setError('Failed to complete setup');
    } finally {
      setCompleting(false);
    }
  }

  if (loading) {
    return <div className="text-center text-gray-500 py-8">Loading zones...</div>;
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">Select Zones</h2>
      <p className="text-gray-600 mb-6 text-center">
        Choose which Cloudflare zones FlareDDNS should manage.
      </p>
      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
      <div className="space-y-2 mb-6 max-h-64 overflow-y-auto">
        {zones.map(zone => (
          <label
            key={zone.id}
            className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
              selected.has(zone.id) ? 'border-cf-orange bg-orange-50' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <input
              type="checkbox"
              checked={selected.has(zone.id)}
              onChange={() => toggleZone(zone.id)}
              className="w-4 h-4 text-cf-orange rounded focus:ring-cf-orange"
            />
            <span className="ml-3 font-medium text-gray-900">{zone.name}</span>
            <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${
              zone.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
            }`}>{zone.status}</span>
          </label>
        ))}
        {zones.length === 0 && (
          <p className="text-gray-500 text-center py-4">No zones found in your Cloudflare account.</p>
        )}
      </div>
      <button
        onClick={handleComplete}
        disabled={selected.size === 0 || completing}
        className="w-full py-2 bg-cf-orange text-white rounded-lg hover:bg-cf-orange-dark transition-colors disabled:opacity-50"
      >
        {completing ? 'Completing setup...' : `Complete Setup (${selected.size} zone${selected.size !== 1 ? 's' : ''} selected)`}
      </button>
    </div>
  );
}

function CodeBlock({ title, children }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(children).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-gray-700">{title}</span>
        <button onClick={handleCopy} className="text-xs text-cf-orange hover:text-cf-orange-dark">
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="bg-gray-900 text-gray-100 text-sm p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">{children}</pre>
    </div>
  );
}

function CompleteStep({ completionData, onComplete }) {
  const usernames = completionData?.ddnsUsers?.map(u => u.username) || ['USERNAME'];
  const user = usernames[0];

  return (
    <div>
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl text-green-600">{'\u2713'}</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Setup Complete!</h2>
        <p className="text-gray-600">FlareDDNS is ready to receive dynamic DNS updates.</p>
      </div>

      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h3 className="font-medium text-gray-900 mb-2">DDNS Credentials</h3>
        <p className="text-sm text-gray-600 mb-1">
          Username{usernames.length > 1 ? 's' : ''}: <strong>{usernames.join(', ')}</strong>
        </p>
        <p className="text-sm text-gray-500">Passwords are set via the DDNS_USERS environment variable.</p>
      </div>

      <div className="space-y-2">
        <h3 className="font-medium text-gray-900">Router Configuration</h3>

        <CodeBlock title="MikroTik">{`/ip cloud set ddns-enabled=no
/tool fetch url="http://YOUR_SERVER:8080/nic/update\\
?hostname=YOUR_HOSTNAME&myip=$(ip/address/get \\
[find interface=ether1] address)" \\
user=${user} password=PASSWORD mode=http`}</CodeBlock>

        <CodeBlock title="Huawei/ZTE ONT">{`Service provider: Custom/DynDNS
Server: YOUR_SERVER:8080
Hostname: your.domain.com
Username: ${user}
Password: PASSWORD`}</CodeBlock>

        <CodeBlock title="ddclient">{`protocol=dyndns2
server=YOUR_SERVER:8080
login=${user}
password=PASSWORD
your.domain.com`}</CodeBlock>

        <CodeBlock title="curl test">{`curl "http://${user}:PASSWORD@YOUR_SERVER:8080/nic/update?hostname=your.domain.com&myip=1.2.3.4"`}</CodeBlock>
      </div>

      <button
        onClick={onComplete}
        className="w-full mt-6 py-2 bg-cf-orange text-white rounded-lg hover:bg-cf-orange-dark transition-colors"
      >
        Go to Dashboard
      </button>
    </div>
  );
}

export default function SetupWizard({ onComplete }) {
  const [step, setStep] = useState(0);
  const [completionData, setCompletionData] = useState(null);

  function nextStep() {
    setStep(prev => prev + 1);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-lg">
        <StepIndicator current={step} />
        {step === 0 && <WelcomeStep onNext={nextStep} />}
        {step === 1 && <TokenStep onNext={nextStep} />}
        {step === 2 && <ZoneStep onNext={nextStep} setCompletionData={setCompletionData} />}
        {step === 3 && <CompleteStep completionData={completionData} onComplete={onComplete} />}
      </div>
    </div>
  );
}
