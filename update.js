const fs = require('fs');
let code = fs.readFileSync('apps/frontend/src/features/employees/EmployeesPage.tsx', 'utf8');

const oldStr = \          {!isLoading && !error && totalPages > 1 && (
            <div className=\\\
pagination-row\\\>
              <button
                className=\\\mini-btn\\\
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={safePage === 1}
              >
                {t('employees.prevPage')}
              </button>
              <span>
                {t('employees.pageLabel', {
                  current: safePage,
                  total: totalPages,
                })}
              </span>
              <button
                className=\\\mini-btn\\\
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={safePage === totalPages}
              >
                {t('employees.nextPage')}
              </button>
            </div>
          )}\;

const newStr = \          {!isLoading && !error && filteredItems.length > 0 ; (
            <div className=\\\pagination-row
sticky-pagination\\\>
              <div className=\\\pagination-page-size\\\>
                <span className=\\\page-size-label\\\>{t('employees.pageSize', 'Hiển thị: ')}</span>
                <select 
                  className=\\\page-size-select\\\ 
                  value={pageSize} 
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
              <div className=\\\pagination-controls\\\>
                <button
                  className=\\\mini-btn\\\
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={safePage === 1}
                >
                  {t('employees.prevPage')}
                </button>
                <span>
                  {t('employees.pageLabel', {
                    current: safePage,
                    total: totalPages,
                  })}
                </span>
                <button
                  className=\\\mini-btn\\\
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  disabled={safePage === totalPages}
                >
                  {t('employees.nextPage')}
                </button>
              </div>
            </div>
          )}\;

if (code.includes(oldStr)) {
  code = code.replace(oldStr, newStr);
  fs.writeFileSync('apps/frontend/src/features/employees/EmployeesPage.tsx', code, 'utf8');
  console.log('Update OK');
} else {
  console.log('OLD STRING NOT FOUND in file.');
}

