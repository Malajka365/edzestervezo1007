import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { CheckCircle2, XCircle, Loader2, Database, Key, Globe } from 'lucide-react'

export default function SupabaseConnectionTest() {
  const [status, setStatus] = useState({
    loading: true,
    connected: false,
    error: null,
    details: {
      url: null,
      keyPresent: false,
      dbVersion: null,
    },
  })

  useEffect(() => {
    testConnection()
  }, [])

  const testConnection = async () => {
    setStatus({ ...status, loading: true, error: null })

    try {
      // 1. Ellenőrizzük a környezeti változókat
      const url = import.meta.env.VITE_SUPABASE_URL
      const key = import.meta.env.VITE_SUPABASE_ANON_KEY

      if (!url || url === 'your_supabase_url_here') {
        throw new Error('VITE_SUPABASE_URL nincs beállítva a .env fájlban')
      }

      if (!key || key === 'your_supabase_anon_key_here') {
        throw new Error('VITE_SUPABASE_ANON_KEY nincs beállítva a .env fájlban')
      }

      // 2. Teszteljük a kapcsolatot egy egyszerű lekérdezéssel
      const { data, error } = await supabase
        .from('_supabase_migrations')
        .select('version')
        .limit(1)

      // Ha nincs ilyen tábla, próbáljunk egy auth lekérdezést
      if (error && error.code === '42P01') {
        // Tábla nem létezik, de a kapcsolat működik
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          throw sessionError
        }

        setStatus({
          loading: false,
          connected: true,
          error: null,
          details: {
            url: url.replace(/https?:\/\//, ''),
            keyPresent: true,
            dbVersion: 'N/A (Auth OK)',
          },
        })
        return
      }

      if (error) {
        throw error
      }

      // 3. Sikeres kapcsolat
      setStatus({
        loading: false,
        connected: true,
        error: null,
        details: {
          url: url.replace(/https?:\/\//, ''),
          keyPresent: true,
          dbVersion: data?.[0]?.version || 'Connected',
        },
      })
    } catch (err) {
      setStatus({
        loading: false,
        connected: false,
        error: err.message,
        details: {
          url: import.meta.env.VITE_SUPABASE_URL?.replace(/https?:\/\//, '') || 'Nincs beállítva',
          keyPresent: !!import.meta.env.VITE_SUPABASE_ANON_KEY && 
                      import.meta.env.VITE_SUPABASE_ANON_KEY !== 'your_supabase_anon_key_here',
          dbVersion: null,
        },
      })
    }
  }

  return (
    <div className="card max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center">
          <Database className="w-6 h-6 mr-2 text-primary-400" />
          Supabase Kapcsolat Teszt
        </h2>
        <button
          onClick={testConnection}
          disabled={status.loading}
          className="btn-secondary text-sm"
        >
          {status.loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            'Újratesztelés'
          )}
        </button>
      </div>

      {/* Status Card */}
      <div
        className={`p-4 rounded-lg border-2 mb-6 ${
          status.loading
            ? 'bg-slate-700 border-slate-600'
            : status.connected
            ? 'bg-green-900/30 border-green-600'
            : 'bg-red-900/30 border-red-600'
        }`}
      >
        <div className="flex items-center space-x-3">
          {status.loading ? (
            <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
          ) : status.connected ? (
            <CheckCircle2 className="w-8 h-8 text-green-400" />
          ) : (
            <XCircle className="w-8 h-8 text-red-400" />
          )}
          <div>
            <h3 className="text-lg font-bold text-white">
              {status.loading
                ? 'Kapcsolat tesztelése...'
                : status.connected
                ? '✅ Sikeres kapcsolat!'
                : '❌ Kapcsolat sikertelen'}
            </h3>
            {status.error && (
              <p className="text-sm text-red-300 mt-1">{status.error}</p>
            )}
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">
          Kapcsolat Részletek
        </h3>

        {/* URL */}
        <div className="flex items-start space-x-3 p-3 bg-slate-700 rounded-lg">
          <Globe className="w-5 h-5 text-primary-400 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-400 mb-1">Supabase URL</p>
            <p className="text-sm text-white font-mono break-all">
              {status.details.url || 'Nincs beállítva'}
            </p>
          </div>
          {status.details.url && status.details.url !== 'Nincs beállítva' ? (
            <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
          ) : (
            <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          )}
        </div>

        {/* API Key */}
        <div className="flex items-start space-x-3 p-3 bg-slate-700 rounded-lg">
          <Key className="w-5 h-5 text-primary-400 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-400 mb-1">Anon API Key</p>
            <p className="text-sm text-white font-mono">
              {status.details.keyPresent ? '••••••••••••••••' : 'Nincs beállítva'}
            </p>
          </div>
          {status.details.keyPresent ? (
            <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
          ) : (
            <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          )}
        </div>

        {/* DB Version */}
        <div className="flex items-start space-x-3 p-3 bg-slate-700 rounded-lg">
          <Database className="w-5 h-5 text-primary-400 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-400 mb-1">Adatbázis Státusz</p>
            <p className="text-sm text-white font-mono">
              {status.details.dbVersion || 'Nem elérhető'}
            </p>
          </div>
          {status.connected ? (
            <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
          ) : (
            <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          )}
        </div>
      </div>

      {/* Help Section */}
      {!status.connected && !status.loading && (
        <div className="mt-6 p-4 bg-yellow-900/30 border border-yellow-700 rounded-lg">
          <h4 className="text-sm font-bold text-yellow-300 mb-2">
            🔧 Hibaelhárítás
          </h4>
          <ul className="text-sm text-yellow-200 space-y-1">
            <li>• Ellenőrizd a <code className="bg-slate-700 px-1 rounded">.env</code> fájlt</li>
            <li>• Győződj meg róla, hogy a Supabase projekt aktív</li>
            <li>• Indítsd újra a dev szervert (<code className="bg-slate-700 px-1 rounded">npm run dev</code>)</li>
            <li>• Nézd meg a <code className="bg-slate-700 px-1 rounded">SUPABASE_SETUP.md</code> útmutatót</li>
          </ul>
        </div>
      )}

      {status.connected && (
        <div className="mt-6 p-4 bg-green-900/30 border border-green-700 rounded-lg">
          <p className="text-sm text-green-200">
            🎉 <strong>Remek!</strong> A Supabase kapcsolat működik. Most már használhatod az
            autentikációt és az adatbázist.
          </p>
        </div>
      )}
    </div>
  )
}
