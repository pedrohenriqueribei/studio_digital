import React, { useState } from 'react';
import {
  Shield,
  Key,
  Users,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Code2,
  Terminal,
  Lock,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { RoleType } from '../../types';

export const SuperAdminClaimsManager: React.FC = () => {
  const {
    superAdminUser,
    firebaseUser,
    businesses,
    professionals,
    activeClaims,
    setSimulatedClaims,
    refreshClaimsFromFirebase,
  } = useApp();

  const [targetUid, setTargetUid] = useState(firebaseUser?.uid || 'user_pedro_campos');
  const [selectedRole, setSelectedRole] = useState<RoleType>('super_admin');
  const [selectedTenantId, setSelectedTenantId] = useState<string>(businesses[0]?.id || '');
  const [selectedProId, setSelectedProId] = useState<string>(professionals[0]?.id || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const activeClaimsJson = JSON.stringify(activeClaims, null, 2);

  const handleApplyClaims = async () => {
    setIsUpdating(true);
    setFeedback(null);

    try {
      const newClaims = {
        role: selectedRole,
        ...(selectedRole !== 'super_admin' ? { tenant_id: selectedTenantId } : {}),
        ...(selectedRole === 'professional' ? { professional_id: selectedProId } : {}),
        assignedAt: Date.now(),
      };

      // Update in AppContext / Client session
      setSimulatedClaims(newClaims);

      setFeedback({
        type: 'success',
        message: `Custom Claims aplicadas com sucesso: role [${selectedRole}]${selectedTenantId ? ` no tenant [${selectedTenantId}]` : ''}.`,
      });
    } catch (e: any) {
      setFeedback({
        type: 'error',
        message: e?.message || 'Erro ao aplicar claims.',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleForceRefresh = async () => {
    setIsUpdating(true);
    try {
      await refreshClaimsFromFirebase();
      setFeedback({
        type: 'success',
        message: 'Token ID e claims recarregados do Firebase Authentication!',
      });
    } catch (e: any) {
      setFeedback({
        type: 'error',
        message: e?.message || 'Falha ao sincronizar claims do token.',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const nodeCodeSnippet = `// Backend (Firebase Admin SDK / Cloud Function)
import * as admin from 'firebase-admin';

await admin.auth().setCustomUserClaims('${targetUid}', {
  role: '${selectedRole}',${selectedRole !== 'super_admin' ? `\n  tenant_id: '${selectedTenantId}',` : ''}${selectedRole === 'professional' ? `\n  professional_id: '${selectedProId}',` : ''}
});`;

  const copyCode = () => {
    navigator.clipboard.writeText(nodeCodeSnippet);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-amber-600 uppercase tracking-wider flex items-center gap-1">
              <Shield className="w-3.5 h-3.5" />
              <span>Segurança & RBAC</span>
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            Gerenciador de Custom User Claims (Firebase Auth)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Atribua funções seguras (super_admin, tenant_manager, professional) e vincule estabelecimentos (tenant_id)
          </p>
        </div>

        <button
          onClick={handleForceRefresh}
          disabled={isUpdating}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer self-start md:self-auto disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin' : ''}`} />
          <span>Forçar Refresh do Token</span>
        </button>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center gap-2.5 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Two Column Layout: Editor & Live Token Claims */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Claims Assignment Form */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-5">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
            <Key className="w-4 h-4 text-amber-500" />
            <span>Atribuir Custom Claims a um Usuário</span>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                UID do Usuário no Firebase Auth
              </label>
              <input
                type="text"
                value={targetUid}
                onChange={(e) => setTargetUid(e.target.value)}
                placeholder="Ex: u9283nd9283hdksad"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-500 font-mono text-xs bg-slate-50 focus:bg-white"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                UID atual conectado: {firebaseUser?.uid || 'user_pedro_campos'}
              </span>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Função de Acesso (role)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'super_admin', label: 'Super Admin', desc: 'CEO Global (/admin/*)' },
                  { id: 'tenant_manager', label: 'Gerente', desc: 'Tenant (/app/gerente/*)' },
                  { id: 'professional', label: 'Profissional', desc: 'Prestador (/app/profissional/*)' },
                ].map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelectedRole(r.id as RoleType)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      selectedRole === r.id
                        ? 'border-indigo-600 bg-indigo-50/60 ring-1 ring-indigo-600'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span className="font-bold text-slate-900 block">{r.label}</span>
                    <span className="text-[10px] text-slate-500 block mt-0.5 leading-tight">
                      {r.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {selectedRole !== 'super_admin' && (
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Estabelecimento Vinculado (tenant_id)
                </label>
                <select
                  value={selectedTenantId}
                  onChange={(e) => setSelectedTenantId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white font-semibold focus:outline-none focus:border-slate-500 text-xs"
                >
                  {businesses.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.tradeName} ({b.id}) - {b.city}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Regras de segurança do Firestore bloquearão acessos fora deste tenant_id.
                </span>
              </div>
            )}

            {selectedRole === 'professional' && (
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Vínculo com Cadastro de Profissional (professional_id)
                </label>
                <select
                  value={selectedProId}
                  onChange={(e) => setSelectedProId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white font-semibold focus:outline-none focus:border-slate-500 text-xs"
                >
                  {professionals
                    .filter((p) => !selectedTenantId || p.businessId === selectedTenantId)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.id})
                      </option>
                    ))}
                </select>
              </div>
            )}

            <button
              type="button"
              onClick={handleApplyClaims}
              disabled={isUpdating}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Aplicar Custom Claims no Perfil Ativo</span>
            </button>
          </div>
        </div>

        {/* Card 2: Active Claims & Token Inspector */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <Terminal className="w-4 h-4 text-emerald-600" />
                <span>Payload do ID Token Ativo (Decoded Claims)</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                Token Válido
              </span>
            </div>

            <div className="mt-4">
              <pre className="p-4 rounded-xl bg-slate-950 text-emerald-400 font-mono text-[11px] overflow-x-auto leading-relaxed border border-slate-800 max-h-60">
                {activeClaimsJson}
              </pre>
            </div>
          </div>

          {/* Backend Admin SDK Snippet */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5 text-indigo-600" />
                <span>Código Backend (Firebase Admin SDK):</span>
              </span>
              <button
                onClick={copyCode}
                className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer inline-flex items-center gap-1"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? 'Copiado!' : 'Copiar Código'}</span>
              </button>
            </div>
            <pre className="p-3 rounded-lg bg-slate-900 text-slate-300 font-mono text-[10px] overflow-x-auto border border-slate-800">
              {nodeCodeSnippet}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
