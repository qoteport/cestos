filepath = "src/components/FieldAdminPortalWorkspace.tsx"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add Leave State & Effects
state_target = "const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);"
state_replacement = """const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);

  // Leave Requests & Leave Booking State
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [showBookLeaveModal, setShowBookLeaveModal] = useState(false);
  const [bookLeaveEmp, setBookLeaveEmp] = useState<any | null>(null);
  const [bookLeaveForm, setBookLeaveForm] = useState({
    employee_id: '',
    leave_type: 'ANNUAL',
    start_date: new Date().toISOString().slice(0, 10),
    end_date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    reason: '',
  });
  const [bookLeaveSubmitting, setBookLeaveSubmitting] = useState(false);

  const loadLeaveRequests = useCallback(async () => {
    setLeaveLoading(true);
    try {
      const res = await apiFetch<any>('/api/v1/employees/leave-requests/all').catch(() =>
        apiFetch<any>('/api/v1/hr/leave-requests')
      );
      const items = Array.isArray(res) ? res : res?.items || [];
      setLeaveRequests(items);
    } catch {
      setLeaveRequests([]);
    } finally {
      setLeaveLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLeaveRequests();
  }, [loadLeaveRequests]);

  async function handleBookLeaveSubmit(e: React.FormEvent) {
    e.preventDefault();
    const empId = bookLeaveForm.employee_id || bookLeaveEmp?.id;
    if (!empId) {
      setBanner({ type: 'error', message: 'Please select an employee.' });
      return;
    }
    setBookLeaveSubmitting(true);
    try {
      await apiFetch(`/api/v1/employees/${empId}/leave-requests`, {
        method: 'POST',
        body: JSON.stringify({
          leave_type: bookLeaveForm.leave_type,
          start_date: bookLeaveForm.start_date,
          end_date: bookLeaveForm.end_date,
          reason: bookLeaveForm.reason,
        }),
      });
      setBanner({ type: 'success', message: 'Leave request submitted successfully for approval.' });
      setShowBookLeaveModal(false);
      setBookLeaveEmp(null);
      await loadLeaveRequests();
    } catch (err: any) {
      setBanner({ type: 'error', message: err.message || 'Failed to submit leave request.' });
    } finally {
      setBookLeaveSubmitting(false);
    }
  }"""

if state_target in content:
    content = content.replace(state_target, state_replacement)
    print("Added state & effects for Leave Management")
else:
    print("state_target not found")

# 2. Update Subtitle and Button in PEOPLE Tab
people_target = """                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Project Workforce</h2>
                    <p className="text-xs text-slate-500">View employee profiles, licenses & submit HR document download requests</p>
                  </div>
                </div>"""

people_replacement = """                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Project Workforce</h2>
                    <p className="text-xs text-slate-500">View employee profiles, licenses &amp; book leave requests with approval status</p>
                  </div>
                </div>"""

btn_target = """                          <button
                            onClick={() => {
                              setContractEmp(emp);
                              setContractForm({
                                title: `Employment Contract - ${emp.first_name || ''} ${emp.last_name || ''}`.trim(),
                                start_date: emp.contract_start_date ? String(emp.contract_start_date).slice(0, 10) : new Date().toISOString().slice(0, 10),
                                end_date: emp.contract_end_date ? String(emp.contract_end_date).slice(0, 10) : '',
                                notes: '',
                              });
                              setContractFile(null);
                              setShowContractModal(true);
                            }}
                            className="flex items-center justify-center gap-1 py-1.5 px-3 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-lg transition truncate"
                          >
                            <Upload size={13} /> Upload Contract
                          </button>"""

btn_replacement = """                          <button
                            onClick={() => {
                              setBookLeaveEmp(emp);
                              setBookLeaveForm((prev) => ({
                                ...prev,
                                employee_id: String(emp.id),
                                leave_type: 'ANNUAL',
                                start_date: new Date().toISOString().slice(0, 10),
                                end_date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
                                reason: '',
                              }));
                              setShowBookLeaveModal(true);
                            }}
                            className="flex items-center justify-center gap-1 py-1.5 px-3 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-lg transition truncate"
                          >
                            <Calendar size={13} /> Book Leave
                          </button>"""

content = content.replace(people_target, people_replacement)
content = content.replace(btn_target, btn_replacement)

# 3. Add Leave Table after Employee Cards Grid in PEOPLE Tab
grid_end_target = """                  )}
                </div>
              </div>
            )}"""

grid_end_replacement = """                  )}
                </div>

                {/* WORKFORCE LEAVE REQUESTS & APPROVAL STATUS TABLE */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border p-5 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between flex-wrap gap-3 border-b pb-3 dark:border-slate-800">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                        <Calendar className="text-orange-600" size={16} /> Workforce Leave Bookings &amp; Approval Status
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">Track employee leave requests, date ranges, and HR approval statuses</p>
                    </div>
                    <button
                      onClick={() => {
                        setBookLeaveEmp(null);
                        setBookLeaveForm((prev) => ({
                          ...prev,
                          employee_id: filteredEmployees[0]?.id ? String(filteredEmployees[0].id) : '',
                          leave_type: 'ANNUAL',
                          start_date: new Date().toISOString().slice(0, 10),
                          end_date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
                          reason: '',
                        }));
                        setShowBookLeaveModal(true);
                      }}
                      className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5"
                    >
                      <Plus size={14} /> Book Leave for Employee
                    </button>
                  </div>

                  {leaveLoading ? (
                    <p className="text-xs text-slate-500 py-6 text-center">Loading workforce leave records...</p>
                  ) : leaveRequests.length === 0 ? (
                    <p className="text-xs text-slate-500 py-6 text-center">No leave requests recorded for this workforce scope.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-50 dark:bg-slate-800/50 border-b dark:border-slate-800 text-slate-500">
                          <tr>
                            <th className="px-4 py-2.5 text-left font-bold uppercase">Employee</th>
                            <th className="px-4 py-2.5 text-left font-bold uppercase">Leave Type</th>
                            <th className="px-4 py-2.5 text-left font-bold uppercase">Start Date</th>
                            <th className="px-4 py-2.5 text-left font-bold uppercase">End Date</th>
                            <th className="px-4 py-2.5 text-left font-bold uppercase">Reason</th>
                            <th className="px-4 py-2.5 text-left font-bold uppercase">Approval Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y dark:divide-slate-800">
                          {leaveRequests.map((req: any) => {
                            const empName = req.employee_name || req.employee?.full_name || (req.employee?.first_name ? `${req.employee.first_name} ${req.employee.last_name || ''}` : null) || 'Employee';
                            const status = String(req.status || 'PENDING').toUpperCase();
                            return (
                              <tr key={req.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{empName}</td>
                                <td className="px-4 py-3 font-medium">
                                  <span className="inline-flex px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-[11px]">
                                    {String(req.leave_type || req.type || 'ANNUAL').replaceAll('_', ' ')}
                                  </span>
                                </td>
                                <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">{req.start_date ? String(req.start_date).slice(0, 10) : '-'}</td>
                                <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">{req.end_date ? String(req.end_date).slice(0, 10) : '-'}</td>
                                <td className="px-4 py-3 text-slate-600 dark:text-slate-400 max-w-xs truncate">{req.reason || 'Leave booking request'}</td>
                                <td className="px-4 py-3">
                                  <StatusBadge status={status} />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}"""

content = content.replace(grid_end_target, grid_end_replacement)

# 4. Add Book Leave Modal to modals section
modal_jsx = """
      {/* BOOK LEAVE MODAL */}
      {showBookLeaveModal && (
        <div className="fixed inset-0 bg-slate-950/70 z-50 flex items-center justify-center p-4 overflow-hidden">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b px-6 py-4 bg-white dark:bg-slate-900">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar className="text-orange-600" size={20} /> Book Leave for Employee
              </h3>
              <button
                type="button"
                onClick={() => setShowBookLeaveModal(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleBookLeaveSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold mb-1">Select Employee *</label>
                <select
                  required
                  value={bookLeaveForm.employee_id}
                  onChange={(e) => setBookLeaveForm({ ...bookLeaveForm, employee_id: e.target.value })}
                  className="w-full border rounded-xl p-2.5 bg-slate-50 dark:bg-slate-800 font-medium text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                >
                  <option value="">-- Choose Employee --</option>
                  {employees.map((emp: any) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name} ({emp.job_title || emp.employee_number || 'Staff'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1">Leave Category / Type *</label>
                <select
                  required
                  value={bookLeaveForm.leave_type}
                  onChange={(e) => setBookLeaveForm({ ...bookLeaveForm, leave_type: e.target.value })}
                  className="w-full border rounded-xl p-2.5 bg-slate-50 dark:bg-slate-800 font-medium text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                >
                  <option value="ANNUAL">Annual Leave</option>
                  <option value="SICK">Sick Leave</option>
                  <option value="EMERGENCY">Emergency Leave</option>
                  <option value="MATERNITY">Maternity / Paternity Leave</option>
                  <option value="UNPAID">Unpaid Leave</option>
                  <option value="STUDY">Study / Training Leave</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={bookLeaveForm.start_date}
                    onChange={(e) => setBookLeaveForm({ ...bookLeaveForm, start_date: e.target.value })}
                    className="w-full border rounded-xl p-2.5 bg-slate-50 dark:bg-slate-800 font-medium text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">End Date *</label>
                  <input
                    type="date"
                    required
                    value={bookLeaveForm.end_date}
                    onChange={(e) => setBookLeaveForm({ ...bookLeaveForm, end_date: e.target.value })}
                    className="w-full border rounded-xl p-2.5 bg-slate-50 dark:bg-slate-800 font-medium text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">Reason / Leave Details *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="State the reason or details for this leave request..."
                  value={bookLeaveForm.reason}
                  onChange={(e) => setBookLeaveForm({ ...bookLeaveForm, reason: e.target.value })}
                  className="w-full border rounded-xl p-2.5 bg-slate-50 dark:bg-slate-800 font-medium text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowBookLeaveModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 font-bold rounded-xl text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bookLeaveSubmitting}
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {bookLeaveSubmitting ? <RefreshCw className="animate-spin h-3.5 w-3.5" /> : <Calendar size={14} />}
                  Submit Leave Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
"""

content = content.replace("</main>", modal_jsx + "\n    </main>")

with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)
print("Successfully updated FieldAdminPortalWorkspace with Leave Booking & Leave Table!")
