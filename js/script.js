let chartInstance = null;

document.getElementById("ritaseForm").addEventListener("submit", function (event) {
  event.preventDefault();

  const nama = document.getElementById("nama").value;
  const nrp = document.getElementById("nrp").value;
  const tanggal = document.getElementById("tanggal").value;
  const shift = document.getElementById("shift").value;
  const waktu = document.getElementById("waktu").value;
  const no_pc_1250 = document.getElementById("no_pc_1250").value;
  const nama_operator = document.getElementById("nama_operator").value;
  const list_hd = document.getElementById("list_hd").value.split(",");
  const start_loading = document.getElementById("start_loading").value;
  const hm_awal = parseFloat(document.getElementById("hm_awal").value);
  const hm_sementara = parseFloat(document.getElementById("hm_sementara").value);
  const jarak = parseFloat(document.getElementById("jarak").value);

  const jumlah_ritase = list_hd.length;
  const kapasitas_hd = 100;
  const productivity = (jumlah_ritase * kapasitas_hd) / (hm_sementara || 1);

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
    productivity,
  };

  let laporanList = JSON.parse(localStorage.getItem("laporan")) || [];
  laporanList.push(laporan);
  localStorage.setItem("laporan", JSON.stringify(laporanList));

  tambahTabel(laporan);
  tampilkanChart();
});

function tambahTabel(data) {
  const tbody = document.getElementById("laporanTable").querySelector("tbody");
  const tr = document.createElement("tr");
  tr.innerHTML = `
      <td>${data.nama}</td>
      <td>${data.nrp}</td>
      <td>${data.tanggal}</td>
      <td>${data.shift}</td>
      <td><button class="btn btn-danger btn-sm" onclick="hapusLaporan(this)">Hapus</button></td>
    `;
  tbody.appendChild(tr);
}

function hapusLaporan(button) {
  const row = button.closest("tr");
  const nama = row.cells[0].textContent;
  let laporanList = JSON.parse(localStorage.getItem("laporan")) || [];
  const updatedList = laporanList.filter((item) => item.nama !== nama);
  localStorage.setItem("laporan", JSON.stringify(updatedList));
  row.remove();
  tampilkanChart();
}

window.onload = function () {
  const laporanList = JSON.parse(localStorage.getItem("laporan")) || [];
  laporanList.forEach((laporan) => tambahTabel(laporan));
  tampilkanChart();
};

function tampilkanChart() {
  const data = JSON.parse(localStorage.getItem("laporan")) || [];
  const labels = data.map((item) => `${item.nama} (${item.tanggal})`);
  const produktivitas = data.map((item) => parseFloat(item.productivity));
  const ritase = data.map((item) => item.list_hd.length);

  // PRODUCTIVITY CHART
  const ctx1 = document.getElementById("productivityChart").getContext("2d");
  if (window.productivityChartInstance) window.productivityChartInstance.destroy();
  window.productivityChartInstance = new Chart(ctx1, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Produktivitas (Ton/HM)",
          data: produktivitas,
          backgroundColor: "rgba(54, 162, 235, 0.6)",
          borderColor: "rgba(54, 162, 235, 1)",
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "Ton/HM",
          },
        },
      },
    },
  });

  // MATCHING FLEET CHART (Jumlah Ritase)
  const ctx2 = document.getElementById("matchingFleetChart").getContext("2d");
  if (window.matchingFleetChartInstance) window.matchingFleetChartInstance.destroy();
  window.matchingFleetChartInstance = new Chart(ctx2, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Jumlah Ritase (Matching Fleet)",
          data: ritase,
          backgroundColor: "rgba(255, 206, 86, 0.6)",
          borderColor: "rgba(255, 206, 86, 1)",
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "Jumlah Ritase",
          },
        },
      },
    },
  });

  // PRODUCTIVITY vs MATCHING FLEET
  const ctx3 = document.getElementById("productivityVsMatchingFleetChart").getContext("2d");
  if (window.prodVsFleetChartInstance) window.prodVsFleetChartInstance.destroy();
  window.prodVsFleetChartInstance = new Chart(ctx3, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Produktivitas (Ton/HM)",
          data: produktivitas,
          borderColor: "rgba(75, 192, 192, 1)",
          backgroundColor: "rgba(75, 192, 192, 0.2)",
          yAxisID: "y1",
        },
        {
          label: "Jumlah Ritase",
          data: ritase,
          borderColor: "rgba(255, 99, 132, 1)",
          backgroundColor: "rgba(255, 99, 132, 0.2)",
          yAxisID: "y2",
        },
      ],
    },
    options: {
      responsive: true,
      interaction: {
        mode: "index",
        intersect: false,
      },
      stacked: false,
      scales: {
        y1: {
          type: "linear",
          position: "left",
          title: {
            display: true,
            text: "Produktivitas (Ton/HM)",
          },
        },
        y2: {
          type: "linear",
          position: "right",
          title: {
            display: true,
            text: "Jumlah Ritase",
          },
          grid: {
            drawOnChartArea: false,
          },
        },
      },
    },
  });
}

// Untuk CSV file upload
document.getElementById("csvFile").addEventListener("change", function (event) {
  const file = event.target.files[0];

  if (file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      const csvData = e.target.result;
      Papa.parse(csvData, {
        header: true,
        skipEmptyLines: true,
        complete: function (results) {
          const data = results.data.map((row) => {
            const list_hd = row.list_hd.split(",");
            const productivity = (list_hd.length * 100) / (parseFloat(row.hm_sementara) || 1);
            return {
              ...row,
              list_hd,
              productivity: productivity,
            };
          });

          localStorage.setItem("laporan", JSON.stringify(data));
          document.querySelector("#laporanTable tbody").innerHTML = "";
          data.forEach((laporan) => tambahTabel(laporan));
          tampilkanChart();
        },
      });
    };
    reader.readAsText(file);
  }
});
