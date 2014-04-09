//////////////////////////////////////////////////////////
//////  メッシュ生成完了字のwebGLの処理
//////////////////////////////////////////////////////
function renderWebGL(width, height, vert, face) {
	// レンダラの初期化
	var renderer=new THREE.WebGLRenderer({ antialias: true });
	renderer.setSize(width, height);
	renderer.setClearColor(0x000000, 1);
	document.body.appendChild(renderer.domElement);
	renderer.shadowMapEnabled=true;

	// シーンの作成
	var scene=new THREE.Scene();

	// カメラの作成
	var camera=new THREE.PerspectiveCamera(15, window.innerWidth/window.innerHeight, 1, 100000);
	camera.position=new THREE.Vector3(0, 0, 1000);
	camera.lookAt(new THREE.Vector3(0, 0, 0));
	scene.add(camera);

	// カメラコントロールを作成
	var cameraCtrl=new THREE.OrbitControls(camera);
	cameraCtrl.center=new THREE.Vector3(0, 0, 0);

	// ライトの作成
	var light=new THREE.SpotLight(0xffffff, 1.0, 0, Math.PI/10, 40);
	light.position.set(500, -500, 2000);
	light.castShadow=true;
	lightHelper=new THREE.SpotLightHelper(light, 100);
	light.shadowCameraVisible=false;
	light.shadowMapWidth = 2048;
	light.shadowMapHeight = 2048;
	scene.add(light);
	//scene.add(lightHelper);


	var brain = new THREE.Geometry();
	// 頂点
	for(var i = 0; i < vert.length; i++) {
		brain.vertices.push(new THREE.Vector3(vert[i][0], vert[i][1], vert[i][2]));
	}

	// 面
	for(var i = 0; i < face.length; i++){
		brain.faces.push(new THREE.Face3(face[i][0], face[i][1], face[i][2]));
	}

	var brainMaterial = new THREE.MeshPhongMaterial({
		color: 0xeb7988, specular: 0xffffff, shininess: 50,
		side: THREE.DoubleSide
	});
	// 法線ベクトル
	brain.computeFaceNormals();
	brain.computeVertexNormals();
	// メッシュオブジェクト作成
	var brainMesh = new THREE.Mesh(brain, brainMaterial);
	brainMesh.position.set(0, 0, 0);
	//brainMesh.castShadow = true;
	brainMesh.receiveShadow = true;

	// メッシュをsceneへ追加
	scene.add(brainMesh);

	// レンダリング
	function render() {
		requestAnimationFrame(render);
		cameraCtrl.update();
		renderer.render(scene, camera);
	};

	render();

}
