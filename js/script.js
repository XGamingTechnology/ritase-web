document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("ritaseForm");
  const filterSelect = document.getElementById("filterNama");

  if (!form) {
    console.error("Form dengan ID 'ritaseForm' tidak ditemukan!");
    return;
  }
  if (!filterSelect) {
    console.error("Dropdown filter 'filterNama' tidak ditemukan!");
    return;
  }

  // Expose globally
  window.hapusLaporan = hapusLaporan;
  window.filterLaporan = filterLaporan;

  // Bind filter change
  filterSelect.addEventListener("change", filterLaporan);

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    // Ambil nilai input
    const nama = document.getElementById("nama").value.trim();
    const nrp = document.getElementById("nrp").value.trim();
    const tanggal = document.getElementById("tanggal").value;
    const shift = document.getElementById("shift").value.trim();
    const waktu = document.getElementById("waktu").value.trim();
    const no_pc_1250 = document.getElementById("no_pc_1250").value.trim();
    const nama_operator = document.getElementById("nama_operator").value.trim();
    const list_hd = document
      .getElementById("list_hd")
      .value.split(",")
      .map((hd) => hd.trim())
      .filter(Boolean);
    const start_loading = document.getElementById("start_loading").value;
    const hm_awal = parseFloat(document.getElementById("hm_awal").value) || 0;
    const hm_sementara = parseFloat(document.getElementById("hm_sementara").value) || 1;
    const jarak = parseFloat(document.getElementById("jarak").value) || 0;
    const catatan = document.getElementById("catatan").value.trim();

    // Jumlah ritase (manual atau berdasarkan list)
    const jumlah_ritase_input = parseFloat(document.getElementById("jumlah_ritase").value) || 0;
    const jumlah_ritase = jumlah_ritase_input > 0 ? jumlah_ritase_input : list_hd.length;

    // Matching fleet inputs
    const jumlah_hd = parseFloat(document.getElementById("jumlah_hd").value) || 0;
    const cycle_time_loader = parseFloat(document.getElementById("Cycle_Time_loader").value) || 0;
    const cycle_time_hauler = parseFloat(document.getElementById("Cycle_time_hauler").value) || 1;

    // Hitung produktivitas
    const kapasitas_hd = 42;
    const productivity = (jumlah_ritase * kapasitas_hd) / (hm_sementara - hm_awal || 1);

    // Hitung matching fleet
    const matchingFleet = (jumlah_hd * cycle_time_loader) / cycle_time_hauler;

    const laporan = {
      nama,
      nrp,
      tanggal,
      shift,
      waktu,
      no_pc_1250,
      nama_operator,
      list_hd,
      start_loading,
      hm_awal,
      hm_sementara,
      jarak,
      jumlah_ritase,
      jumlah_hd,
      cycle_time_loader,
      cycle_time_hauler,
      productivity: parseFloat(productivity.toFixed(2)),
      matchingFleet: parseFloat(matchingFleet.toFixed(2)),
      catatan,
    };

    // Simpan & render
    const laporanList = JSON.parse(localStorage.getItem("laporan")) || [];
    laporanList.push(laporan);
    localStorage.setItem("laporan", JSON.stringify(laporanList));

    tambahTabel(laporan);
    updateFilterOptions();
    tampilkanChart();
  });

  function tambahTabel(data) {
    const tbody = document.querySelector("#laporanTable tbody");
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${data.nama}</td>
      <td>${data.nrp}</td>
      <td>${data.tanggal}</td>
      <td>${data.shift}</td>
      <td>${data.start_loading}</td>
      <td>${data.hm_awal}</td>
      <td>${data.hm_sementara}</td>
      <td>${data.jarak}</td>
      <td>${data.productivity}</td>
      <td>${data.matchingFleet}</td>
      <td>${data.catatan}</td>
      <td><button class="btn btn-danger btn-sm" onclick="hapusLaporan(this)">Hapus</button></td>
    `;
    tbody.appendChild(tr);
  }

  function hapusLaporan(button) {
    const row = button.closest("tr");
    const nama = row.cells[0].textContent;
    let laporanList = JSON.parse(localStorage.getItem("laporan")) || [];
    laporanList = laporanList.filter((item) => item.nama !== nama);
    localStorage.setItem("laporan", JSON.stringify(laporanList));
    row.remove();
    updateFilterOptions();
    tampilkanChart();
  }

  function updateFilterOptions() {
    const laporanList = JSON.parse(localStorage.getItem("laporan")) || [];
    const sel = document.getElementById("filterNama");
    sel.innerHTML = '<option value="">Pilih Nama</option>';
    [...new Set(laporanList.map((r) => r.nrp))].forEach((n) => {
      const opt = document.createElement("option");
      opt.value = n;
      opt.textContent = n;
      sel.appendChild(opt);
    });
  }

  function filterLaporan() {
    const key = document.getElementById("filterNama").value;
    const all = JSON.parse(localStorage.getItem("laporan")) || [];
    const subset = key ? all.filter((r) => r.nrp === key) : all;
    document.querySelector("#laporanTable tbody").innerHTML = "";
    subset.forEach((r) => tambahTabel(r));
    tampilkanChart(subset);
  }

  // Export semua data
  document.getElementById("exportAllBtn").addEventListener("click", function () {
    const laporanList = JSON.parse(localStorage.getItem("laporan")) || [];
    if (laporanList.length === 0) {
      alert("Tidak ada data untuk diekspor.");
      return;
    }
    exportToExcel(laporanList, "laporan_ritase_semua.xlsx");
  });

  // Export data hasil filter
  document.getElementById("exportFilteredBtn").addEventListener("click", function () {
    const key = document.getElementById("filterNama").value;
    const all = JSON.parse(localStorage.getItem("laporan")) || [];
    const filtered = key ? all.filter((r) => r.nrp === key) : all;
    if (filtered.length === 0) {
      alert("Tidak ada data yang sesuai filter untuk diekspor.");
      return;
    }
    exportToExcel(filtered, `laporan_ritase_${key || "semua"}.xlsx`);
  });

  function tampilkanChart(dataOverride) {
    const data = dataOverride || JSON.parse(localStorage.getItem("laporan")) || [];
    const labels = data.map((r) => `${r.nama} (${r.tanggal})`);
    const prod = data.map((r) => r.productivity);
    const mf = data.map((r) => r.matchingFleet);

    // Productivity
    const c1 = document.getElementById("productivityChart").getContext("2d");
    if (window.prodChart) window.prodChart.destroy();
    window.prodChart = new Chart(c1, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Produktivitas (BCM)",
            data: prod,
            backgroundColor: "rgba(54,162,235,0.6)",
          },
        ],
      },
      options: { responsive: true, scales: { y: { beginAtZero: true } } },
    });

    // Matching Fleet
    const c2 = document.getElementById("matchingFleetChart").getContext("2d");
    if (window.mfChart) window.mfChart.destroy();
    window.mfChart = new Chart(c2, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Matching Fleet",
            data: mf,
            backgroundColor: "rgba(255,99,132,0.6)",
          },
        ],
      },
      options: { responsive: true, scales: { y: { beginAtZero: true } } },
    });

    // Combined
    const c3 = document.getElementById("productivityVsMatchingFleetChart").getContext("2d");
    if (window.combinedChart) window.combinedChart.destroy();
    window.combinedChart = new Chart(c3, {
      data: {
        labels,
        datasets: [
          { label: "Produktivitas", data: prod, type: "bar", yAxisID: "y1", backgroundColor: "rgba(54,162,235,0.6)" },
          { label: "Matching Fleet", data: mf, type: "line", yAxisID: "y2", borderColor: "rgba(255,99,132,1)", fill: false },
        ],
      },
      options: { responsive: true, scales: { y1: { type: "linear", position: "left", beginAtZero: true }, y2: { type: "linear", position: "right", beginAtZero: true, grid: { drawOnChartArea: false } } } },
    });
  }
  function exportToExcel(dataArray, filename) {
    const worksheet = XLSX.utils.json_to_sheet(dataArray);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Ritase");
    XLSX.writeFile(workbook, filename);
  }
  // init
  JSON.parse(localStorage.getItem("laporan") || "[]").forEach((r) => tambahTabel(r));
  updateFilterOptions();
  tampilkanChart();
});
