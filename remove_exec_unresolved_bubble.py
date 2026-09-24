filepath = "src/components/ExecutivePortalWorkspace.tsx"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

target = """      {/*  FLOATING BUBBLE FOR UNRESOLVED CLAIMS  */}
      {unresolvedClaimsCount > 0 && activeTab !== 'HSE' && (
        <button
          onClick={() => setActiveTab('HSE')}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-full shadow-2xl transition transform hover:scale-105 animate-bounce"
        >
          <FileText size={16} />
          <span>{unresolvedClaimsCount} Unresolved Claims</span>
          <span className="w-2 h-2 rounded-full bg-slate-950 animate-ping" />
        </button>
      )}"""

if target in content:
    content = content.replace(target, "")
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
    print("Successfully removed unresolved claims floating bubble from ExecutivePortalWorkspace!")
else:
    print("Target not found in ExecutivePortalWorkspace")
