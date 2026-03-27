const fs = require('fs');
let code = fs.readFileSync('apps/frontend/src/features/employees/EmployeesPage.tsx', 'utf8');

const start = code.indexOf('  function renderOrganizationView() {');
const end = code.indexOf('  function renderContractView() {');

if (start !== -1 && end !== -1) {
  const replacement = \  function renderDepartmentsView() {
    return (
      <div className="organization-view">
        <p className="employees-meta">{t('employees.organization.description')}</p>

        {deleteConfirm && (
          <div className="employee-modal-backdrop" onClick={() => setDeleteConfirm(null)}>
            <div className="delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
              <h3>{t('employees.organization.deleteConfirmTitle')}</h3>
              <p>
                {t('employees.organization.deleteConfirmMessage', {
                  type: t('employees.organization.department'),
                  name: deleteConfirm.name,
                })}
              </p>
              <div className="delete-confirm-actions">
                <button className="mini-btn" onClick={() => setDeleteConfirm(null)}>
                  {t('common.cancel')}
                </button>
                <button
                  className="admin-delete-btn"
                  onClick={() => deleteDepartment(deleteConfirm.name)}
                >
                  {t('employees.organization.delete')}
                </button>
              </div>
            </div>
          </div>
        )}

        {selectedDeptDetails && (
          <div className="employee-modal-backdrop" onClick={() => setSelectedDeptDetails(null)}>
            <div className="delete-confirm-modal members-modal" onClick={(e) => e.stopPropagation()}>
              <h3>{t('employees.organization.department')}: {selectedDeptDetails === 'Unassigned' ? (t('employees.organization.unassigned') || 'Chưa phân bổ') : selectedDeptDetails}</h3>
              <div className="members-list">
                {items.filter(i => (i.departmentId || 'Unassigned') === selectedDeptDetails).map(member => (
                  <div key={member.id} className="member-item">
                    <span className="member-name">{member.fullName}</span>
                    <span className={"member-role role-pill role-" + member.role}>{member.role}</span>
                  </div>
                ))}
                {items.filter(i => (i.departmentId || 'Unassigned') === selectedDeptDetails).length === 0 && (
                  <p className="employees-meta">Không có thành viên</p>
                )}
              </div>
              <div className="delete-confirm-actions">
                <button className="mini-btn" onClick={() => setSelectedDeptDetails(null)}>
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}

        {canCreate && (
          <div className="org-add-panels">
            <div className="org-add-panel">
              <input
                className="input-control"
                value={newDepartment}
                onChange={(event) => setNewDepartment(event.target.value)}
                placeholder={t('employees.organization.departmentPlaceholder')}
              />
              <button className="mini-btn" type="button" onClick={addDepartment}>
                {t('employees.organization.addDepartment')}
              </button>
            </div>
          </div>
        )}

        <div className="org-tree-container">
          {departments.map((dept) => {
            const count = departmentStats[dept] ?? 0;
            const isManual = manualDepartments.includes(dept);
            return (
              <div className="org-dept-card clickable-card" key={dept} onClick={() => setSelectedDeptDetails(dept)}>
                <div className="org-dept-header">
                  <span className="org-dept-icon">🏢</span>
                  <div className="org-dept-info">
                    <h4 className="org-dept-name">{dept === 'Unassigned' ? (t('employees.organization.unassigned') || 'Chưa phân bổ') : dept}</h4>
                    <span className="org-dept-count">{count} {t('employees.organization.employees')}</span>
                  </div>
                </div>
                {isManual && canCreate && (
                  <button
                    className="org-node-delete"
                    onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ type: 'department', name: dept }); }}
                    title={t('employees.organization.delete')}
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function renderTeamsView() {
    return (
      <div className="organization-view">
        <p className="employees-meta">{t('employees.organization.description')}</p>

        {deleteConfirm && (
          <div className="employee-modal-backdrop" onClick={() => setDeleteConfirm(null)}>
            <div className="delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
              <h3>{t('employees.organization.deleteConfirmTitle')}</h3>
              <p>
                {t('employees.organization.deleteConfirmMessage', {
                  type: t('employees.organization.team'),
                  name: deleteConfirm.name,
                })}
              </p>
              <div className="delete-confirm-actions">
                <button className="mini-btn" onClick={() => setDeleteConfirm(null)}>
                  {t('common.cancel')}
                </button>
                <button
                  className="admin-delete-btn"
                  onClick={() => deleteTeam(deleteConfirm.name)}
                >
                  {t('employees.organization.delete')}
                </button>
              </div>
            </div>
          </div>
        )}

        {selectedTeamDetails && (
          <div className="employee-modal-backdrop" onClick={() => setSelectedTeamDetails(null)}>
            <div className="delete-confirm-modal members-modal" onClick={(e) => e.stopPropagation()}>
              <h3>{t('employees.organization.team')}: {selectedTeamDetails}</h3>
              <div className="members-list">
                {items.filter(i => i.teamId === selectedTeamDetails).map(member => (
                  <div key={member.id} className="member-item">
                    <span className="member-name">{member.fullName}</span>
                    <span className={"member-role role-pill role-" + member.role}>{member.role}</span>
                  </div>
                ))}
                {items.filter(i => i.teamId === selectedTeamDetails).length === 0 && (
                  <p className="employees-meta">Không có thành viên</p>
                )}
              </div>
              <div className="delete-confirm-actions">
                <button className="mini-btn" onClick={() => setSelectedTeamDetails(null)}>
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}

        {canCreate && (
          <div className="org-add-panels">
            <div className="org-add-panel">
              <input
                className="input-control"
                value={newTeam}
                onChange={(event) => setNewTeam(event.target.value)}
                placeholder={t('employees.organization.teamPlaceholder')}
              />
              <button className="mini-btn" type="button" onClick={addTeam}>
                {t('employees.organization.addTeam')}
              </button>
            </div>
          </div>
        )}

        <div className="org-tree-container">
          {teams.map((team) => {
            const count = teamStats[team] ?? 0;
            const isManual = manualTeams.includes(team);
            return (
              <div className="org-dept-card clickable-card" key={team} onClick={() => setSelectedTeamDetails(team)}>
                <div className="org-dept-header">
                  <span className="org-dept-icon">👥</span>
                  <div className="org-dept-info">
                    <h4 className="org-dept-name">{team}</h4>
                    <span className="org-dept-count">{count} {t('employees.organization.employees')}</span>
                  </div>
                </div>
                {isManual && canCreate && (
                  <button
                    className="org-node-delete"
                    onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ type: 'team', name: team }); }}
                    title={t('employees.organization.delete')}
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }
\;

  code = code.substring(0, start) + replacement + code.substring(end);
  fs.writeFileSync('apps/frontend/src/features/employees/EmployeesPage.tsx', code);
}
