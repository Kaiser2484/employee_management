const fs = require('fs');
let code = fs.readFileSync('apps/frontend/src/features/employees/EmployeesPage.tsx', 'utf8');

code = code.replace(/const PAGE_SIZE = 6;\r?\n/g, '');
code = code.replace('const [page, setPage] = useState(1);', 'const [page, setPage] = useState(1);\n    const [pageSize, setPageSize] = useState(6);');
code = code.replace(/PAGE_SIZE/g, 'pageSize');

let p1 = code.indexOf('{!isLoading && !error && totalPages > 1 && (');
if(p1 > -1) {
    let before = code.substring(0, p1);
    let after_p1 = code.substring(p1);
    let p2 = after_p1.indexOf('          )}');
    let p3 = after_p1.indexOf('          )}', p2 + 2); // It's the pagination ending
    let rest = after_p1.substring(p2 + 12);
    
    let replacement = \          {!isLoading && !error && filteredItems.length > 0 && (
            <div className=\\
pagination-row
sticky-pagination\\>
              <div className=\\pagination-page-size\\>
                <span className=\\page-size-label\\>{t('employees.pageSize', 'Hiển thị: ')}</span>
                <select className=\\page-size-select\\ value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>
                  <option value={5}>5 / trang</option>
                   <option value={6}>6 / trang</option>
                  <option value={10}>10 / trang</option>
                  <option value={20}>20 / trang</option>
                  <option value={50}>50 / trang</option>
                </select>
              </div>
              <div className=\\pagination-controls\\>
                <button className=\\mini-btn\\ onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={safePage === 1}>
                  {t('employees.prevPage')}
                </button>
                <span>
                  {t('employees.pageLabel', { current: safePage, total: totalPages })}
                </span>
                <button className=\\mini-btn\\ onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={safePage === totalPages}>
                  {t('employees.nextPage')}
                </button>
              </div>
            </div>
          )}\;
          
    fs.writeFileSync('apps/frontend/src/features/employees/EmployeesPage.tsx', before + replacement + rest, 'utf8');
    console.log('Update OK by nodejs string ops');
} else {
    console.log('Block not found');
}
