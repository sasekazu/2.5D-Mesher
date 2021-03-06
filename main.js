// JavaScript Document
/// <reference path="http://ajax.googleapis.com/ajax/libs/jquery/1/jquery.min.js" />
/// <reference path="numeric-1.2.6.min.js" />
/// <reference path="outline.js" />
/// <reference path="delaunay.js" />
/// <reference path="drawFunc.js" />


$(document).ready(function () {

	// ブラウザ判定, 警告メッセージ
	var ua = window.navigator.userAgent.toLowerCase();
	var ver = window.navigator.appVersion.toLowerCase();
	if (ua.indexOf('chrome') != -1){
		// chromeはOK
	}else if (ua.indexOf('firefox') != -1){
		// firefoxはOK
	} else {
		alert("お使いのブラウザは非推奨です．推奨ブラウザは Google Chrome と Firefox です．Internet Explorer は HTML5 File API の互換性対応ができていないため，作成したデータを保存できません．");
	}

	
	// 詳細設定を消しておく
	$('#detail').hide();

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
	var clickState = "Up";	// 左ボタンの状態 Up, Down
	var mousePos = [];		// 左ボタンの位置
	var clickStateR = "Up";	// 右ボタンの状態 Up, Down
	var clickPosR = [];		// 右ボタンの位置

	// 初期状態はアウトライン作成
	var state = "drawOutLine";

	// アウトライン作成用変数
	var outline = new Outline();
	var cv;
	var drawingFlag = true;    // 書き終わった後にクリックしなおしてから次の描画を始めるためのフラグ

	// メッシュ作成用変数
	var mesh;

	// 2.5次元メッシュ用変数
	var mesh25d;


	/////////////////////////////////
	// 画像の読み込み
	//////////////////////////////////

	var img = new Image();

	$("#uploadFile").change(function () {
		// 選択されたファイルを取得
		var file=this.files[0];
		// 画像ファイル以外は処理中止
		if(!file.type.match(/^image\/(png|jpeg|gif)$/)) return;
		var reader=new FileReader();
		// File APIを使用し、ローカルファイルを読み込む
		reader.onload=function (evt) {
			// 画像のURLをソースに設定
			img.src=evt.target.result;
		}
		// ファイルを読み込み、データをBase64でエンコードされたデータURLにして返す
		reader.readAsDataURL(file);
	});

	// 最初の画像を選択
	img.src = "brank.png?" + new Date().getTime();
	

	// 画像が読み込まれたときに実行
	img.onload=function () {
		calcImgParameters();
		// 画像以外の変数の初期化
		state="drawOutLine";
		cv=new ClosedCurve(minlen);
		outline=new Outline();
		$("#imgCheckBox").attr("checked", true ) // 画像表示チェックを入れる
		mainloop();
	}
	calcImgParameters = function(){
		dx=0.5*(canvasWidth-imgSc*img.width/img.height*canvasHeight);
		dy=0.5*(1-imgSc)*canvasHeight;
		dw=imgSc*canvasHeight*img.width/img.height;
		dh=imgSc*canvasHeight;
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

	
	// 画像スケールのスライダイベント
	$("#imgScSlider").slider({
		min: 0,
		max: 1,
		step: 0.01,
		value: imgSc,
		slide: function (event, ui) {
			imgSc = ui.value;
			document.getElementById('imgScSpan').innerHTML = imgSc;
			calcImgParameters();
		}
	});
	document.getElementById('imgScSpan').innerHTML=imgSc;


	/////////////////////////////////////////////////////////
	/////////　メインの処理
	/////////////////////////////////////////////////////////

	var prevState = 'none';		
	function mainloop() {

		var time0 = new Date();
		var message;
		// ボタンハイライト
		if(prevState!==state){
			buttonHighlight(state);
		}
		// メイン処理
		switch(state) {
			case "drawOutLine":
				message = "マウスで線を描いてください．線の始点と終点を合わせると輪郭として追加されます．グリッドはひとマス10mmです．描けたら「2．輪郭修正」をクリック．";
				drawOutLineFunc();
				break;
			case "editOutLine":
				message = "マウスで点を動かして輪郭を整えてください．マウス右ボタンで長さが測れます．モデルを拡大縮小するには詳細設定の「出力スケール」を調整してください．修正できたら「3．メッシュ生成」をクリック．";
				editOutLineFunc();
				break;
			case "generateMesh":
				message = "メッシュ生成中です．（入り組んだ境界はうまく分割できないことがあります…．）";
				generateMeshFunc();
				break;
			case "meshComplete":
				message = "メッシュ生成が完了しました、「4．3D表示」で確認してください．（入り組んだ境界はうまく分割できないことがあります…．）";
				meshCompleteFunc();
				break;
			case "3dView":
				message = "厚さは詳細設定から変えることができます．これでよければ「5．保存」をクリックし，生成されたリンクから右クリックして保存してください．"
				break;
		}
		// メッセージと窓サイズ情報の反映
		$("#modeMessage").text(message);

		var time1 = new Date();
		//console.log(time1-time0 + " [ms]");

		prevState = state;

		setTimeout(mainloop, 30);
	}


	/////////////////////////////////////////////////////////
	////////　 ボタンハイライト関数
	/////////////////////////////////////////////////////////
	function buttonHighlight(state){
			oncolor = 'seagreen';
			offcolor = '#404040';
		switch(state){
			case "drawOutLine":
				$('#drawOutLineButton').css('background-color', oncolor);
				$('#editOutLineButton').css('background-color', offcolor);
				$('#meshButton').css('background-color', offcolor);
				$('#3dButton').css('background-color', offcolor);
				break;
			case "editOutLine":
				$('#drawOutLineButton').css('background-color', offcolor);
				$('#editOutLineButton').css('background-color', oncolor);
				$('#meshButton').css('background-color', offcolor);
				$('#3dButton').css('background-color', offcolor);
				break;
			case "generateMesh":
				$('#drawOutLineButton').css('background-color', offcolor);
				$('#editOutLineButton').css('background-color', offcolor);
				$('#meshButton').css('background-color', oncolor);
				$('#3dButton').css('background-color', offcolor);
				break;
			case "meshComplete":
				break;
			case "3dView":
				$('#drawOutLineButton').css('background-color', offcolor);
				$('#editOutLineButton').css('background-color', offcolor);
				$('#meshButton').css('background-color', offcolor);
				$('#3dButton').css('background-color', oncolor);
				break;
		}
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
						// 曲線同士の交差判定を行う場合
						/*
						// 曲線同士の交差判定を行う
						var intFlag = false;
						for (var i = 0; i < outline.closedCurves.length; i++) {
							if (outline.closedCurves[i].intersect(cv)) {
								intFlag = true;
								break;
							}
						}
						// 交差がなければ輪郭に追加する
						if(!intFlag){
							outline.addClosedLine(cv);
						}
						*/
						// 曲線同士の交差判定を行わない場合
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
		
		outline.setBoundary(clickState, mousePos);	

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
		if(imgFlag) {
			context.globalAlpha = 0.7;
			context.drawImage(img, dx, dy, dw, dh);
			context.globalAlpha = 1.0;
		}

		// グリッドの表示
		var gridFlag = $('#gridCheckBox').is(':checked');
		if(gridFlag) {
			context.fillStyle = 'lightgray'; 
			context.strokeStyle = 'lightgray';
			drawGrid(context, 0, 0, canvasWidth, canvasHeight, 10/mmperpixel, 10/mmperpixel);
		}

		context.fillStyle = 'rgb(0, 0, 0)'; // 黒
		context.strokeStyle = 'rgb(0, 0, 0)'; // 黒
		context.lineWidth = outlineWidth;

		// 作成中の曲線の描画
		for (var i = 0; i < cv.lines.length; ++i) {
			drawLine(context, cv.lines[i].start, cv.lines[i].end);
			drawCircleS(context, cv.lines[i].start, 1);
			drawCircleS(context, cv.lines[i].end, 1);
		}
		var color = 'rgb(255,0,0)';
		context.fillStyle = color;
		drawCircle(context, cv.endpos, 2);

		// 輪郭全体の描画
		var color = 'rgb(0,0,0)';
		context.fillStyle = color;
		for (var c = 0; c < outline.closedCurves.length; c++) {
			var cvtmp = outline.closedCurves[c];
			for (var i = 0; i < cvtmp.lines.length; ++i) {
				drawLine(context, cvtmp.lines[i].start, cvtmp.lines[i].end);
				if(state == "editOutLine") {
					drawCircle(context, cvtmp.lines[i].start, outlineWidth);
					drawCircle(context, cvtmp.lines[i].end, outlineWidth);
				}
			}
		}		
		context.lineWidth = 1.0;

		// 右クリック定規の描画
		drawRightButtonRuler();

	}
	
	//////////////////////////////////////////////////////////
	//////  メッシュ生成処理
	//////////////////////////////////////////////////////
	function generateMeshFunc() {
		var imgFlag = $('#imgCheckBox').is(':checked');
		if(!mesh.addPoint()) {
			// メッシュ生成が完了したら実行される処理
			mesh.meshGen();
			state = "meshComplete";
			mesh25d = new Mesh25d(mesh.dPos, mesh.tri);
			
			$('#saveDiv').show("slow");
		}

		// 描画リセット
		context.setTransform(1, 0, 0, 1, 0, 0);
		context.clearRect(0, 0, canvasWidth, canvasHeight);
		
		// 全体の写真を描画
		if(imgFlag)
			context.drawImage(img, dx, dy, dw, dh);

		// グリッドの表示
		var gridFlag = $('#gridCheckBox').is(':checked');
		if(gridFlag) {
			context.fillStyle = 'lightgray'; 
			context.strokeStyle = 'lightgray';
			drawGrid(context, 0, 0, canvasWidth, canvasHeight, 10/mmperpixel, 10/mmperpixel);
		}

		// メッシュの描画
		context.strokeStyle='black';
		context.fillStyle='lightseagreen';
		context.globalAlpha = 0.7;
		for(var i=0; i<mesh.tri.length; ++i) {
			var tri=[mesh.tri[i][0], mesh.tri[i][1], mesh.tri[i][2]];
			if(mesh.triInOut[i]) {
				drawTri(context, mesh.dPos[tri[0]], mesh.dPos[tri[1]], mesh.dPos[tri[2]]);
			}
			drawTriS(context, mesh.dPos[tri[0]], mesh.dPos[tri[1]], mesh.dPos[tri[2]]);
		}
		context.globalAlpha = 1.0;

		// 輪郭全体の描画
		var color = 'rgb(20,20,20)';
		context.fillStyle=color;
		context.strokeStyle=color;
		for (var c = 0; c < mesh.outline.closedCurves.length; c++) {
			var cvtmp = mesh.outline.closedCurves[c];
			for (var i = 0; i < cvtmp.lines.length; ++i) {
				drawLine(context, cvtmp.lines[i].start, cvtmp.lines[i].end);
			}
		}		

		
		// 右クリック定規の描画
		drawRightButtonRuler();

	}

	//////////////////////////////////////////////////////////
	//////  メッシュ生成完了後の描画処理
	//////////////////////////////////////////////////////
	function meshCompleteFunc() {

		var imgFlag = $('#imgCheckBox').is(':checked');
	
		// 描画リセット
		context.setTransform(1, 0, 0, 1, 0, 0);
		context.clearRect(0, 0, canvasWidth, canvasHeight);

		// 全体の写真を描画
		if(imgFlag) {
			context.drawImage(img, dx, dy, dw, dh);
		}

		// グリッドの表示
		var gridFlag = $('#gridCheckBox').is(':checked');
		if(gridFlag) {
			context.fillStyle = 'lightgray'; 
			context.strokeStyle = 'lightgray';
			drawGrid(context, 0, 0, canvasWidth, canvasHeight, 10/mmperpixel, 10/mmperpixel);
		}

		// メッシュの描画
		///context.strokeStyle='gray';
		context.strokeStyle='lightseagreen';
		context.fillStyle='lightseagreen';
		if(imgFlag) {
			context.globalAlpha = 0.7;
		}
		for(var i=0; i<mesh.tri.length; ++i) {
			var tri=[mesh.tri[i][0], mesh.tri[i][1], mesh.tri[i][2]];
			drawTri(context, mesh.dPos[tri[0]], mesh.dPos[tri[1]], mesh.dPos[tri[2]]);
			drawTriS(context, mesh.dPos[tri[0]], mesh.dPos[tri[1]], mesh.dPos[tri[2]]);
		}
		if(imgFlag) {
			context.globalAlpha = 1.0;
		}

		
		// 右クリック定規の描画
		drawRightButtonRuler();

	}


	//////////////////////////////////////////////////////////
	//////  マウス右クリックで出てくる定規の描画
	//////////////////////////////////////////////////////
	function drawRightButtonRuler() {
		if(clickStateR == "Down") {
			context.strokeStyle = 'darkolivegreen';
			context.fillStyle = 'darkolivegreen';
			context.lineWidth = 2.0;
			drawLine(context, clickPosR[0], mousePos[0])
			context.lineWidth = 1.0;
			var rel = numeric.sub(mousePos[0], clickPosR[0]);
			var len = numeric.norm2(rel);
			len *= mmperpixel;
			len = Math.floor(len);
			context.font = "40px 'Arial'";
			context.fillText(len + 'mm', mousePos[0][0], mousePos[0][1]);
		}
	}


	//////////////////////////////////////////////////////////
	//////  イベント処理
	//////////////////////////////////////////////////////
		
	// リセットボタン
	$("#resetButton").click(function () {
		cv = new ClosedCurve(minlen);
		outline = new Outline();
		state = "drawOutLine";
		hideAndRemoveSaveEle();
	});

	// 輪郭追加ボタン
	$("#drawOutLineButton").click(function () {
		state = "drawOutLine";
		cv = new ClosedCurve(minlen); // 作成中の輪郭は削除する
		hideAndRemoveSaveEle();
	});

	// 輪郭編集ボタン
	$("#editOutLineButton").click(function () {
		if(outline.closedCurves.length === 0) {
			alert("修正する輪郭がありません．輪郭追加ボタンを押して輪郭を作成してください．");
			return;
		}
		state = "editOutLine";
		hideAndRemoveSaveEle();
	});

	// メッシュボタン
	$("#meshButton").click(function () {
		if(outline.closedCurves.length === 0) {
			alert("輪郭がないためメッシュ生成できません．輪郭追加ボタンを押して輪郭を作成してください．");
			return;
		}

		mesh=new DelaunayGen(outline, minlen);
		hideAndRemoveSaveEle();

		state = "generateMesh";
	});

	// 3Dビュー
	$('#3dButton').click(function(){
		state = "3dView";
		$('#mViewCanvas').hide();
		var v = $("#thicknessBox").val();
		var thickness = Number(v);
		var vert = mesh25d.getPos(mmperpixel, thickness);
		renderWebGL(canvasWidth, canvasHeight, mesh25d.modelLength, mesh25d.modelTop, mesh25d.modelBottom, vert, mesh25d.tri);
	});

	// 保存ボタン
	$("#saveButton").click(function(){
		// ダウンロードリンクの構成
		$('#downloadDiv').hide();
		var v = $("#thicknessBox").val();
		var thickness = Number(v);
		var text = mesh25d.makeStl(mmperpixel, thickness);
		var blob = new Blob([text],{"type" : "text/html"});
		var a = document.getElementById('downloadLink');
		a.setAttribute('href', window.URL.createObjectURL(blob));
		a.setAttribute('target', '_blank');
		document.getElementById('thicknessDownload').innerHTML=thickness;
		$('#downloadDiv').show('slow');
	});

	function hideAndRemoveSaveEle() {
		$('#mViewCanvas').show();
		// webglオブジェクトが存在する場合削除
		var oyadom = document.getElementById('webglBox');
		var webglOldDom = document.getElementById('webgl');
		if(webglOldDom) {
			oyadom.removeChild(webglOldDom);
		}
		$('#saveDiv').hide('slow');
		$('#downloadDiv').hide('slow');
	}

	// 詳細設定表示/非表示ボタン
	$("#detailButton").click(function(){
		var detailButton = document.getElementById("detailButton");
		var detailObj = document.getElementById("detail");
		detailState = detailObj.style.display;
		if(detailState === 'none') {
			detailButton.value = "詳細設定非表示" ;
			$('#detail').show('slow');
		} else {
			detailButton.value = "詳細設定表示" ;
			$('#detail').hide('slow');
		}
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
		if(state == "editOutLine") {
			outline.selectHoldNodes(mousePos);
		}
	}

	// 右クリックイベント
	function rightClickFunc(touches) {
		
		clickPosR = [];

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
			clickPosR.push([canvasX, canvasY]);
		}
		clickStateR = "Down";
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

	// 左 or 右クリックのUp時イベント	
	function endFunc() {
		clickState = "Up";
		clickStateR = "Up";
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
		switch(e.button) {
		case 0:
			clickFunc(touches);
			break;
		case 2:
			rightClickFunc(touches);
			break;
		}
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
	
	// キャンバス要素内での右クリック無効化
	$("#mViewCanvas").on('contextmenu',function(e){
		return false;
	});

} );

