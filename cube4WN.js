"use strict";

// deklarasi canvas dan gl
var canvas;
var gl;

// numPositions untuk menentukan jumlah vertex yang akan digambar
// 36 karena 1 kubus terdiri dari 6 sisi, dan setiap sisi terdiri dari 2 segitiga
// 6 * 2 * 3 = 36
var numPositions = 36;

// deklarasi positions dan colors untuk menyimpan data vertex dan warna
var positions = [];
var colors = [];

var position = vec3(-0.9, -0.895, 0);
var direction = vec3(1, 0, 0);

var modelViewMatrixLoc;

var mass = 1; // Initial mass
var force = 0; // Initial force
var acceleration = force / mass; // Initial acceleration
var speedFactor = 0.0001;
var speed = acceleration * speedFactor; // Initial speed
var scaleFactor = 0.2;

// deklarasi vertrices(koordinat) untuk kubus, piramid, dan oktahedron

// koordinat kubus
var cubeVertices = [
  vec4(-0.5, -0.5, 0.5, 1.0),
  vec4(-0.5, 0.5, 0.5, 1.0),
  vec4(0.5, 0.5, 0.5, 1.0),
  vec4(0.5, -0.5, 0.5, 1.0),
  vec4(-0.5, -0.5, -0.5, 1.0),
  vec4(-0.5, 0.5, -0.5, 1.0),
  vec4(0.5, 0.5, -0.5, 1.0),
  vec4(0.5, -0.5, -0.5, 1.0),
];

// koordinat piramid
var pyramidVertices = [
  vec4(0.0, 0.5, 0.0, 1.0),
  vec4(-0.5, -0.5, 0.5, 1.0),
  vec4(0.5, -0.5, 0.5, 1.0),
  vec4(0.5, -0.5, -0.5, 1.0),
  vec4(-0.5, -0.5, -0.5, 1.0),
];

// koordinat oktahedron
var octahedronVertices = [
  vec4(0.0, 0.5, 0.0, 1.0), // bagian atas
  vec4(-0.5, 0.0, 0.5, 1.0),
  vec4(0.5, 0.0, 0.5, 1.0),
  vec4(0.5, 0.0, -0.5, 1.0),
  vec4(-0.5, 0.0, -0.5, 1.0),
  vec4(0.0, -0.5, 0.0, 1.0), // Bottom
];

// deklarasi vertexColors untuk menyimpan warna
var vertexColors = [
  vec4(0.0, 0.0, 0.0, 1.0), // black
  vec4(1.0, 0.0, 0.0, 1.0), // red
  vec4(1.0, 1.0, 0.0, 1.0), // yellow
  vec4(0.0, 1.0, 0.0, 1.0), // green
  vec4(0.0, 0.0, 1.0, 1.0), // blue
  vec4(1.0, 0.0, 1.0, 1.0), // magenta
  vec4(0.0, 1.0, 1.0, 1.0), // cyan
  vec4(1.0, 1.0, 1.0, 1.0), // white
];

// deklarasi variabel untuk menyimpan object yang sedang digambar, default nya adalah kubus
var currentObject = "Cube";

var xAxis = 0; // digunakan untuk rotasi sumbu x
var yAxis = 1; // digunakan untuk rotasi sumbu y
var zAxis = 2; // digunakan untuk rotasi sumbu z
var axis = 0; // digunakan untuk menentukan sumbu rotasi
var theta = [0, 0, 0]; // digunakan untuk menentukan sudut rotasi
var thetaLoc; // digunakan untuk menyimpan lokasi theta pada shader

var vBuffer, cBuffer; // digunakan untuk menyimpan buffer vertex dan color yang nantinya digunakan untuk menggambar

var rotationDirection = [0, 2.0, 0]; // deklarasi rotasi default (rotasi ke kanan)

// fungsi init untuk inisialisasi program
init();

function init() {
  // mendapatkan canvas dan gl
  canvas = document.getElementById("gl-canvas");
  gl = canvas.getContext("webgl2");
  if (!gl) alert("WebGL 2.0 isn't available");

  // setup object yang akan digambar, default nya adalah kubus
  setupCube();

  // setup awal buffer
  // dideklarasikan di awal agar buffer tidak kosong
  gl.viewport(0, 0, canvas.width, canvas.height); // deklarasi viewport untuk menggambar
  gl.clearColor(1.0, 1.0, 1.0, 1.0); // deklarasi warna background
  gl.enable(gl.DEPTH_TEST); // mengaktifkan depth test

  // inisialisasi shader, vertex dan fragment dari html
  var program = initShaders(gl, "vertex-shader", "fragment-shader");
  if (program === -1 || !program) {
    console.error("Shader program initialization failed.");
    return;
  }
  gl.useProgram(program); // menggunakan program yang telah di

  modelViewMatrixLoc = gl.getUniformLocation(program, "uModelViewMatrix");

  // inisialisasi buffer
  // buffer digunakan untuk menyimpan data vertex dan color
  // cBuffer untuk color, vBuffer untuk vertex
  cBuffer = gl.createBuffer(); // deklarasi buffer color
  vBuffer = gl.createBuffer(); // deklarasi buffer vertex

  // melakukan update buffer, penting untuk menggambar
  updateBuffers();

  // mendapatkan lokasi dari color dan position pada shader
  var colorLoc = gl.getAttribLocation(program, "aColor"); // mendapatkan lokasi color pada shader
  gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer); // menyambungkan buffer color
  gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, 0, 0); // memberikan pointer untuk color
  gl.enableVertexAttribArray(colorLoc); // mengaktifkan color

  // mendapatkan lokasi dari position pada shader
  var positionLoc = gl.getAttribLocation(program, "aPosition"); // mendapatkan lokasi position pada shader
  gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer); // menyambungkan buffer vertex
  gl.vertexAttribPointer(positionLoc, 4, gl.FLOAT, false, 0, 0); // memberikan pointer untuk vertex
  gl.enableVertexAttribArray(positionLoc); // mengaktifkan vertex

  // mendapatkan lokasi dari theta pada shader
  // theta adalah sudut rotasi
  thetaLoc = gl.getUniformLocation(program, "uTheta");

  // mendapatkan lokasi dari theta pada shader
  document
    .getElementById("swap-object")
    .addEventListener("change", function () {
      // Mendapatkan object yang dipilih
      var selectedObject = this.value;

      // Mengganti object yang sedang digambar
      currentObject = selectedObject;

      // if else untuk menentukan object yang akan digambar
      if (selectedObject === "Cube") {
        setupCube(); // kubus
      } else if (selectedObject === "Pyramid") {
        setupPyramid(); // piramid
      } else if (selectedObject === "Octahedron") {
        setupOctahedron(); // oktahedron
      }
      updateBuffers(); // Update buffer setelah object diganti
    });

  // deklarasi event listener untuk button di html
  document.getElementById("set-color").addEventListener("click", setColor);

  document.getElementById("rotate-left").addEventListener("click", rotateLeft);
  document
    .getElementById("rotate-right")
    .addEventListener("click", rotateRight);
  document.getElementById("rotate-up").addEventListener("click", rotateUp);
  document.getElementById("rotate-down").addEventListener("click", rotateDown);
  document
    .getElementById("rotate-top-right")
    .addEventListener("click", rotateTopRight);
  document
    .getElementById("rotate-bottom-left")
    .addEventListener("click", rotateBottomLeft);
  document
    .getElementById("rotate-bottom-right")
    .addEventListener("click", rotateBottomRight);
  document
    .getElementById("rotate-center")
    .addEventListener("click", rotateCenter);
  document
    .getElementById("rotate-top-left")
    .addEventListener("click", rotateTopLeft);

  document.getElementById("speed").addEventListener("input", function (event) {
    speed = parseFloat(event.target.value);
  });
  // document.getElementById('scale').addEventListener('input', function(event) {
  //     scaleFactor = parseFloat(event.target.value);
  // });

  document.getElementById("speed").addEventListener("input", function (event) {
    speed = parseFloat(event.target.value);
    document.getElementById("current-speed").innerText = speed;
  });

  document.getElementById("move-left").addEventListener("click", function () {
    direction = vec3(-1, 0, 0); // Move left
  });

  document.getElementById("move-right").addEventListener("click", function () {
    direction = vec3(1, 0, 0); // Move right
  });

  document.getElementById("mass").addEventListener("input", function (event) {
    mass = parseFloat(event.target.value); // Get the new mass
    document.getElementById("current-mass").innerText = mass.toFixed(2); // Update mass display
    updateSpeed(); // Recalculate speed
  });
  
  // Event listener for the force slider
  document.getElementById("force").addEventListener("input", function (event) {
    force = parseFloat(event.target.value); // Get the new force
    document.getElementById("current-force").innerText = force.toFixed(2); // Update force display
    updateSpeed(); // Recalculate speed
  });
  // panggil fungsi render
  render();
}

function updatePosition() {
    position[0] += direction[0] * speed;  // Move along x
    position[1] += direction[1] * speed;  // Move along y
    position[2] += direction[2] * speed;  // Move along z
}

function updateSpeed() {
    if (mass > 0) {
        // Calculate acceleration based on force and mass
        acceleration = force / mass;

        // Apply a modified speed calculation to slow it down more when mass increases
        speed = acceleration * speedFactor;
    } else {
        // If mass is 0, there should be no acceleration or movement
        acceleration = 0;
        speed = 0;
    }

    // Ensure speed doesn't get too high by capping it
    speed = Math.min(speed, 0.05); // You can adjust this max speed cap as needed

    // Update the displayed values for debugging
    document.getElementById("current-acceleration").innerText = acceleration.toFixed(2); // Update acceleration display
    document.getElementById("current-speed").innerText = speed.toFixed(4); // Update speed display with more precision
}



// mendefinisikan fungsi setupCube
function setupCube() {
  positions = []; // mengosongkan positions
  colors = []; // mengosongkan colors
  colorCube(); // memberikan warna pada kubus
  numPositions = 36; // jumlah vertex kubus adalah 36
}

// mendefinisikan fungsi colorCube (warna kubus)
function colorCube() {
  quad(1, 0, 3, 2);
  quad(2, 3, 7, 6);
  quad(3, 0, 4, 7);
  quad(6, 5, 1, 2);
  quad(4, 5, 6, 7);
  quad(5, 4, 0, 1);
}

// mendefinisikan fungsi setupPyramid
function setupPyramid() {
  positions = []; // mengosongkan positions
  colors = []; // mengosongkan colors
  colorPyramid(); // memberikan warna pada piramid
  numPositions = 18; // jumlah vertex piramid adalah 18
}

// mendedinisikan fungsi colorPyramid (warna piramid)
function colorPyramid() {
  triangle(pyramidVertices, 0, 1, 2, 0); // warna sisi piramid (sisi bagian atas)
  triangle(pyramidVertices, 0, 2, 3, 1); // warna sisi piramid (sisi kanan)
  triangle(pyramidVertices, 0, 3, 4, 2); // warna sisi piramid (sisi bawah)
  triangle(pyramidVertices, 0, 4, 1, 3); // warna sisi piramid (sisi kiri)

  // bagian bawah piramid
  triangle(pyramidVertices, 1, 4, 3, 4); // sisi depan
  triangle(pyramidVertices, 1, 3, 2, 4); // sisi belakang
}

// mendefinisikan fungsi setupOctahedron
function setupOctahedron() {
  positions = []; // mengosongkan positions
  colors = []; // mengosongkan colors
  colorOctahedron(); // memberikan warna pada oktahedron
  numPositions = 24; // jumlah vertex oktahedron adalah 24
}

// mendefinisikan fungsi colorOctahedron (warna oktahedron)
function colorOctahedron() {
  // bagian piramid atas dari oktahedron
  triangle(octahedronVertices, 0, 1, 2, 0); // bagian atas ke depan
  triangle(octahedronVertices, 0, 2, 3, 1); // bagian atas ke kanan
  triangle(octahedronVertices, 0, 3, 4, 2); // bagian atas ke belakang
  triangle(octahedronVertices, 0, 4, 1, 3); // bagian atas ke kiri

  // bagian piramid bawah dari oktahedron
  triangle(octahedronVertices, 5, 1, 2, 0); // bagian bawah ke depan
  triangle(octahedronVertices, 5, 2, 3, 1); // bagian bawah ke kanan
  triangle(octahedronVertices, 5, 3, 4, 2); // bagian bawah ke belakang
  triangle(octahedronVertices, 5, 4, 1, 3); // bagian bawah ke kiri
}

// mendefinisikan fungsi triangle (membuat segitiga)
// fungsi ini digunakan untuk membantu membuat sisi dari object
// digunakan untuk membuat sisi dari piramid dan oktahedron
function triangle(vertices, a, b, c, colorIndex) {
  positions.push(vertices[a]); // menambahkan vertex a
  positions.push(vertices[b]); // menambahkan vertex b
  positions.push(vertices[c]); // menambahkan vertex c

  // memberikan warna pada sisi
  var color = vertexColors[colorIndex % vertexColors.length]; // warna berdasarkan index
  colors.push(color); // menambahkan warna
  colors.push(color); // menambahkan warna
  colors.push(color); // menambahkan warna
}

// mendefinisikan fungsi quad (membuat quad)
// quad adalah fungsi yang digunakan untuk membuat sisi dari object
function quad(a, b, c, d) {
  // menambahkan vertex ke positions
  var indices = [a, b, c, a, c, d]; // indices untuk membuat quad
  var color = vertexColors[a % vertexColors.length]; // warna berdasarkan index

  // perulangan untuk menambahkan vertex dan warna untuk setiap indices
  for (var i = 0; i < indices.length; ++i) {
    // menambahkan vertex
    positions.push(cubeVertices[indices[i]]); // menambahkan vertex ke positions
    colors.push(color); // menambahkan warna ke colors
  }
}

// fungsi swapObject untuk mengganti object yang sedang digambar
function swapObject() {
  if (currentObject === "Cube") {
    currentObject = "Pyramid";
    setupPyramid();
  } else if (currentObject === "Pyramid") {
    currentObject = "Octahedron";
    setupOctahedron();
  } else {
    currentObject = "Cube";
    setupCube();
  }

  updateBuffers(); // update setelah object diganti
}

// fungsi untuk mengganti warna object berdasarkan input dari user di html
function setColor() {
  // print out to check if the color is being read correctly
  console.log("Cube color 0:", document.getElementById("cube-color-0").value);

  if (currentObject === "Cube") {
    vertexColors = [
      hexToVec4(document.getElementById("cube-color-0").value),
      hexToVec4(document.getElementById("cube-color-1").value),
      hexToVec4(document.getElementById("cube-color-2").value),
      hexToVec4(document.getElementById("cube-color-3").value),
      hexToVec4(document.getElementById("cube-color-4").value),
      hexToVec4(document.getElementById("cube-color-5").value),
    ];
    setupCube();
  } else if (currentObject === "Pyramid") {
    vertexColors = [
      hexToVec4(document.getElementById("pyramid-color-0").value),
      hexToVec4(document.getElementById("pyramid-color-1").value),
      hexToVec4(document.getElementById("pyramid-color-2").value),
      hexToVec4(document.getElementById("pyramid-color-3").value),
    ];
    setupPyramid();
  } else if (currentObject === "Octahedron") {
    vertexColors = [
      hexToVec4(document.getElementById("octahedron-color-0").value),
      hexToVec4(document.getElementById("octahedron-color-1").value),
      hexToVec4(document.getElementById("octahedron-color-2").value),
      hexToVec4(document.getElementById("octahedron-color-3").value),
    ];
    setupOctahedron();
  }

  updateBuffers();
}

// fungsi untuk mengubah hex color ke vec4
// ini karena warna yang diinput oleh user adalah hex
function hexToVec4(hex) {
  var bigint = parseInt(hex.slice(1), 16);
  var r = ((bigint >> 16) & 255) / 255.0;
  var g = ((bigint >> 8) & 255) / 255.0;
  var b = (bigint & 255) / 255.0;
  return vec4(r, g, b, 1.0);
}

// fungsi untuk mengupdate buffer
// buffer adalah tempat menyimpan data vertex dan color
function updateBuffers() {
  console.log("called updateBuffers");
  console.log("Colors:", colors); // Debugging
  // Update color buffer
  gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW);

  // Update position buffer
  gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(positions), gl.STATIC_DRAW);

  console.log("Positions:", positions);
}

// fungsi fungsi untuk rotasi object
function rotateLeft() {
  rotationDirection = [0, -2.0, 0];
}

function rotateRight() {
  rotationDirection = [0, 2.0, 0];
}

function rotateUp() {
  rotationDirection = [-2.0, 0, 0];
}

function rotateDown() {
  rotationDirection = [2.0, 0, 0];
}

function rotateTopRight() {
  rotationDirection = [-2.0, 2.0, 0];
}

function rotateBottomLeft() {
  rotationDirection = [2.0, -2.0, 0];
}

function rotateBottomRight() {
  rotationDirection = [2.0, 2.0, 0];
}

function rotateCenter() {
  rotationDirection = [0, 0, 0];
}

function rotateTopLeft() {
  rotationDirection = [-2.0, -2.0, 0];
}

// fungsi render untuk menggambar object
function render() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Apply translation to the cube based on
  var scalingMatrix = scale(scaleFactor, scaleFactor, scaleFactor);
  var translationMatrix = translate(position[0], position[1], position[2]);
  var modelViewMatrix = mult(translationMatrix, rotateX(theta[xAxis])); // Update with the rotation

  // Update shaders with the new position and rotation
  var modelViewMatrix = mult(translationMatrix, scalingMatrix);
  modelViewMatrix = mult(modelViewMatrix, rotateX(theta[xAxis])); // Apply rotation

  gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));

  updatePosition(); // Move the cube before rendering the next frame

  // Render logic for cube
  gl.drawArrays(gl.TRIANGLES, 0, numPositions);

  requestAnimationFrame(render);
}
