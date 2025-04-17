document.addEventListener('DOMContentLoaded', function() {
    // Select/Deselect All functionality
    const selectAllBtn = document.getElementById('selectAll');
    const deselectAllBtn = document.getElementById('deselectAll');

    if (selectAllBtn) {
      selectAllBtn.addEventListener('click', function() {
        document.querySelectorAll('.library-checkbox').forEach(checkbox => {
          checkbox.checked = true;
        });
      });
    }

    if (deselectAllBtn) {
      deselectAllBtn.addEventListener('click', function() {
        document.querySelectorAll('.library-checkbox').forEach(checkbox => {
          checkbox.checked = false;
        });
      });
    }

    // Filter functionality (if needed)
    const searchInput = document.getElementById('searchLibraries');
    if (searchInput) {
      searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        document.querySelectorAll('table tbody tr').forEach(row => {
          const libraryName = row.querySelector('td:nth-child(2)').textContent.toLowerCase();
          if (libraryName.includes(searchTerm)) {
            row.style.display = '';
          } else {
            row.style.display = 'none';
          }
        });
      });
    }
  });