// JavaScript Document
/// <reference path="http://ajax.googleapis.com/ajax/libs/jquery/1/jquery.min.js" />
/// <reference path="numeric-1.2.6.min.js" />
/// <reference path="outline.js" />
/// <reference path="delaunay.js" />
/// <reference path="EditableMesh.js" />
/// <reference path="drawFunc.js" />


$(document).ready(function () {

	// 2dコンテキストを取得
	var canvas = $("#mViewCanvas");
	var cvs = document.getElementById('mViewCanvas');	// イベント設定用
	var context = canvas.get(0).getContext("2d");
	var canvasWidth = canvas.width();
	var canvasHeight = canvas.height();

	// 基本的にwindow sizeは変えないことにする
	// タブレット版は変えたほうが良いかも
	/*
	$(window).resize(resizeCanvas);
	function resizeCanvas(){
		canvas.attr("width", $(window).get(0).innerWidth*0.9);
		canvas.attr("height", $(window).get(0).innerHeight*0.7);
		canvasWidth = canvas.width();
		canvasHeight = canvas.height();
	};
	resizeCanvas();	
	*/
	
	
	// マウスポインタに関する変数
	var clickState = "Up";		// Up, Down
	var mousePos = [];

	// 初期状態はアウトライン作成
	var state = "drawOutLine";

	// アウトライン作成用変数
	var outline = new Outline();
	var minlen=20;
	var cv;
	var drawingFlag = true;    // 書き終わった後にクリックしなおしてから次の描画を始めるためのフラグ

	// メッシュ作成用変数
	var mesh;

	// メッシュ編集用変数
	var editMesh;

	/////////////////////////////////
	// 画像の読み込み
	//////////////////////////////////

	var img = new Image();
	var imgSc;
	var dx;
	var dy;
	var dw;
	var dh;

	$("#uploadFile").change(function () {
		// 選択されたファイルを取得
		var file=this.files[0];
		// 画像ファイル以外は処理中止
		if(!file.type.match(/^image\/(png|jpeg|gif)$/)) return;
		var reader=new FileReader();
		// File APIを使用し、ローカルファイルを読み込む
		reader.onload=function (evt) {
			// 画像がloadされた後に、canvasに描画する
			img.onload=function () {
				imgSc=0.7;
				if(img.height<img.width) {
					dx=0.5*(1-imgSc)*canvasWidth;
					dy=0.5*(canvasHeight-imgSc*img.height/img.width*canvasWidth);
					dw=imgSc*canvasWidth;
					dh=imgSc*canvasWidth*img.height/img.width;
				} else {
					dx=0.5*(canvasWidth-imgSc*img.width/img.height*canvasHeight);
					dy=0.5*(1-imgSc)*canvasHeight;
					dw=imgSc*canvasHeight*img.width/img.height;
					dh=imgSc*canvasHeight;
				}
				// 画像以外の変数の初期化
				state="drawOutLine";
				console.log("area "+(dw*dh));
				cv=new ClosedCurve(minlen);
				outline=new Outline();
				mainloop();
			}
			// 画像のURLをソースに設定
			img.src=evt.target.result;
		}
		// ファイルを読み込み、データをBase64でエンコードされたデータURLにして返す
		reader.readAsDataURL(file);
	});

	// 最初の画像を選択
	img.src = "miku.png?" + new Date().getTime();
	

	// 画像が読み込まれたときに実行
	img.onload=function () {
		imgSc=0.5;
		if(img.height<img.width) {
			dx=0.5*(1-imgSc)*canvasWidth;
			dy=0.5*(canvasHeight-imgSc*img.height/img.width*canvasWidth);
			dw=imgSc*canvasWidth;
			dh=imgSc*canvasWidth*img.height/img.width;
		} else {
			dx=0.5*(canvasWidth-imgSc*img.width/img.height*canvasHeight);
			dy=0.5*(1-imgSc)*canvasHeight;
			dw=imgSc*canvasHeight*img.width/img.height;
			dh=imgSc*canvasHeight;
		}
		cv=new ClosedCurve(minlen);
		outline=new Outline();
		mainloop();
	}
	// 画像が読み込めない時も実行
	img.onerror=function(){
		alert("画像が読み込めません");
		// メッシュ表示モードにする
		$("#imgCheckBox").attr("checked", true);
		cv = new ClosedCurve(minlen);
		outline = new Outline();
		mainloop();
	}


	/////////////////////////////////////////////////////////
	/////////　メインの処理
	/////////////////////////////////////////////////////////
		
	function mainloop() {

		var time0 = new Date();
		var message;
		switch(state) {
			case "drawOutLine":
				message = "輪郭追加モード";
				drawOutLineFunc();
				break;
			case "editOutLine":
				message = "輪郭編集モード";
				editOutLineFunc();
				break;
			case "generateMesh":
				message = "メッシュ生成中";
				generateMeshFunc();
				break;
			case "edit":
				message = "メッシュ編集モード";
				editFunc();
				break;
		}
		$("#message").text(message);
		var time1 = new Date();
		//console.log(time1-time0 + " [ms]");

		setTimeout(mainloop, 30);
	}
	
	
	/////////////////////////////////////////////////////////
	////////　 アウトライン作成関数
	/////////////////////////////////////////////////////////
	function drawOutLineFunc(){
		switch (clickState) {
			case "Down":
				if (drawingFlag) {
					cv.addPoint(mousePos[0]);
					// 閉曲線が完成したときの処理
					if (cv.closedFlag) {
						// 曲線同士の交差判定を行う
						var intFlag = false;
						for (var i = 0; i < outline.closedCurves.length; i++) {
							if (outline.closedCurves[i].intersect(cv)) {
								intFlag = true;
								break;
							}
						}
						// 交差がなければ輪郭に追加する
						if(!intFlag)
							outline.addClosedLine(cv);
						drawingFlag = false;
						// 作業用の閉曲線インスタンスを初期化
						cv = new ClosedCurve(minlen);
					}
				}
				break;
			case "Up":
				drawingFlag = true;
				break;
		}

		// 描画実行
		drawOutLine();
	}


	/////////////////////////////////////////////////////////
	////////　 アウトライン作成関数
	/////////////////////////////////////////////////////////
	function editOutLineFunc() {

		// 描画実行
		drawOutLine();
	}

	/////////////////////////////////////////////////////////
	////////　 アウトライン描画関数
	/////////////////////////////////////////////////////////
	function drawOutLine() {
		// 描画処理
		// 画面をリセット
		context.setTransform(1,0,0,1,0,0);
		context.clearRect(0, 0, canvasWidth, canvasHeight);

		// 全体の写真を描画
		var imgFlag = $('#imgCheckBox').is(':checked');
		if(imgFlag)
			context.drawImage(img, dx, dy, dw, dh);

		context.fillStyle = 'rgb(0, 0, 0)'; // 黒
		context.strokeStyle = 'rgb(0, 0, 0)'; // 黒

		// 作成中の曲線の描画
		for (var i = 0; i < cv.lines.length; ++i) {
			drawLine(context, cv.lines[i].start, cv.lines[i].end);
			drawCircle(context, cv.lines[i].start, 2);
			drawCircle(context, cv.lines[i].end, 2);
		}
		var color = 'rgb(255,0,0)';
		context.fillStyle = color;
		drawCircle(context, cv.endpos, 3);

		// 輪郭全体の描画
		context.lineWidth = 4.0;
		var color = 'rgb(0,0,0)';
		context.fillStyle = color;
		for (var c = 0; c < outline.closedCurves.length; c++) {
			var cvtmp = outline.closedCurves[c];
			for (var i = 0; i < cvtmp.lines.length; ++i) {
				drawLine(context, cvtmp.lines[i].start, cvtmp.lines[i].end);
				drawCircle(context, cvtmp.lines[i].start, 1);
				drawCircle(context, cvtmp.lines[i].end, 1);
			}
		}		
		context.lineWidth = 1.0;
	}
	
	//////////////////////////////////////////////////////////
	//////  メッシュ生成処理
	//////////////////////////////////////////////////////
	function generateMeshFunc() {
		var imgFlag = $('#imgCheckBox').is(':checked');
		if(!mesh.addPoint()) {
			mesh.meshGen();
			state = "edit";
			editMesh = new EditableMesh(mesh.dPos, mesh.tri, outline);
		}

		// 描画リセット
		context.setTransform(1, 0, 0, 1, 0, 0);
		context.clearRect(0, 0, canvasWidth, canvasHeight);
		
		// 全体の写真を描画
		if(imgFlag)
			context.drawImage(img, dx, dy, dw, dh);

		// 輪郭全体の描画
		context.lineWidth = 8.0;
		var color = 'rgb(200,200,200)';
		context.fillStyle=color;
		context.strokeStyle=color;
		for (var c = 0; c < outline.closedCurves.length; c++) {
			var cvtmp = outline.closedCurves[c];
			for (var i = 0; i < cvtmp.lines.length; ++i) {
				drawLine(context, cvtmp.lines[i].start, cvtmp.lines[i].end);
			}
		}		
		context.lineWidth = 1.0;

		// メッシュの描画
		var color='rgb(0,0,0)';
		context.strokeStyle=color;
		for(var i=0; i<mesh.tri.length; ++i) {
			var tri=[mesh.tri[i][0], mesh.tri[i][1], mesh.tri[i][2]];
			drawTriS(context, mesh.dPos[tri[0]], mesh.dPos[tri[1]], mesh.dPos[tri[2]]);
		}


	}

	//////////////////////////////////////////////////////////
	//////  編集処理
	//////////////////////////////////////////////////////
	function editFunc() {
		var imgFlag = $('#imgCheckBox').is(':checked');
	
		
		editMesh.setBoundary(clickState, mousePos);	

		// 描画リセット
		context.setTransform(1, 0, 0, 1, 0, 0);
		context.clearRect(0, 0, canvasWidth, canvasHeight);
		
		// 全体の写真を描画
		if(imgFlag)
			context.drawImage(img, dx, dy, dw, dh);

		// メッシュの描画
		var color='rgb(200,200,200)';
		context.strokeStyle=color;
		for(var i=0; i<editMesh.tri.length; ++i) {
			var tri=[editMesh.tri[i][0], editMesh.tri[i][1], editMesh.tri[i][2]];
			drawTriS(context, editMesh.pos[tri[0]], editMesh.pos[tri[1]], editMesh.pos[tri[2]]);
		}

		// 輪郭全体の描画
		context.lineWidth = 4.0;
		var color = 'rgb(0,0,0)';
		context.fillStyle=color;
		context.strokeStyle=color;
		for(var i = 0; i < editMesh.surEdge.length; ++i) {
			drawLine(context, editMesh.pos[editMesh.surEdge[i][0]], editMesh.pos[editMesh.surEdge[i][1]]);
		}
		for(var i = 0; i < editMesh.pos.length; ++i) {
			drawCircle(context, editMesh.pos[i], 1);
		}
		context.lineWidth = 1.0;

	}


	//////////////////////////////////////////////////////////
	//////  イベント処理
	//////////////////////////////////////////////////////
		
	// リセットボタン
	$("#resetButton").click(function () {
		cv = new ClosedCurve(minlen);
		outline = new Outline();
		state = "drawOutLine";
	});

	$("#drawOutLineButton").click(function () {
		state = "drawOutLine";
	});

	$("#editOutLineButton").click(function () {
		state = "editOutLine";
	});

	// メッシュボタン
	$("#meshButton").click(function () {

		if(outline.closedCurves.length==0) {
			cv=new ClosedCurve(minlen);
			cv.addPoint([dx, dy]);
			cv.addPoint([dx, dy+dh]);
			cv.addPoint([dx+dw, dy+dh]);
			cv.addPoint([dx+dw, dy]);
			cv.addPoint([dx, dy]);
			outline.addClosedLine(cv);
		}

		mesh=new DelaunayGen(outline, minlen);

		state = "generateMesh";
	});

	
	//////////////////////////////////////////////////////////
	//////  マウス関連イベント群
	//////////////////////////////////////////////////////////
	
	// クリックまたはタッチに対する処理
	// 引数はタッチしたキャンパス上の点座標が格納されている配列
	function clickFunc(touches){
		
		mousePos = [];
		
		var canvasOffset = canvas.offset();
		for(var i=0; i<touches.length; ++i){
			var canvasX = Math.floor(touches[i].pageX-canvasOffset.left);
			var canvasY = Math.floor(touches[i].pageY-canvasOffset.top);
			if(canvasX < 0 || canvasX > canvasWidth){
				return;
			}
			if(canvasY < 0 || canvasY > canvasHeight){
				return;
			}
			mousePos.push([canvasX, canvasY]);
		}
		clickState = "Down";
		
		// ホールドノードの決定
		if(state == "edit")
			editMesh.selectHoldNodes(mousePos);
	}
	
	// クリックまたはタッチのムーブに対する処理
	// 引数はタッチしたキャンパス上の点座標が格納されている配列
	function moveFunc(touches){
		mousePos = [];
		var canvasOffset = canvas.offset();
		for(var i=0; i<touches.length; ++i){
			var canvasX = Math.floor(touches[i].pageX-canvasOffset.left);
			var canvasY = Math.floor(touches[i].pageY-canvasOffset.top);
			mousePos.push([canvasX, canvasY]);
		}
	}
	
	function endFunc() {
		clickState = "Up";
	}	
	
	// タブレットのタッチイベント
	cvs.addEventListener('touchstart', function(event) {
		event.preventDefault();
		//マルチタッチの場合、タッチ箇所がリストで取得されます。
		touches = event.touches;
		clickFunc(touches);
	}); 
	
	// タブレットのムーブイベント
	cvs.addEventListener('touchmove', function(event) {
		//マルチタッチの場合、タッチ箇所がリストで取得されます。
		touches = event.touches;
		moveFunc(touches);
	});	

	// タブレットのタッチ終了イベント
	cvs.addEventListener('touchend', function() {
		endFunc();
	});
	
	
	// mouseクリック時のイベントコールバック設定
	$(window).mousedown( function(e){
		touches = [];
		touches[0] = e;
		clickFunc(touches);
	});
	
	
	// mouse移動時のイベントコールバック設定
	$(window).mousemove( function(e){
		//if(clickState == "Up")
		//	return;
		touches = [];
		touches[0] = e;
		moveFunc(touches);
	});
	
	// mouseクリック解除時のイベントコールバック設定
	$(window).mouseup( function(e){
		endFunc();
	});
	
	
} );

