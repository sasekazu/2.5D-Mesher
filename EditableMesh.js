// JavaScript Document
/// <reference path="http://ajax.googleapis.com/ajax/libs/jquery/1/jquery.min.js" />
/// <reference path="numeric-1.2.6.min.js" />
/// <reference path="outline.js" />
/// <reference path="delaunay.js" />
/// <reference path="fem.js" />



////////////////////////////////////////////////////////////
// EditableMeshクラスの定義
////////////////////////////////////////////////////////////
	
function EditableMesh(initpos, tri){
	this.pos = numeric.clone(initpos);      // 節点現在位置
	this.initpos = numeric.clone(initpos);  // 節点初期位置

	this.posNum = this.pos.length;

	this.tri = numeric.clone(tri); // 三角形要素の節点リスト
	this.nodeToTri = [];		// ノードに接続している三角形要素リスト
	this.surEdge = [];			// 表面エッジリスト
	this.surToTri = [];		// 表面エッジ-対応する三角形要素リスト
	this.triToSur = [];		// 三角形要素-対応する表面エッジリスト
	this.surNode = [];		// 表面頂点リスト
	this.sndToSur = [];	// 表面頂点に接続している表面エッジリスト
	this.sndToUnDupTri = [];	// 表面頂点に接続している三角形のうち表面エッジを有していないもののリスト
	this.normal = [];	// 表面エッジの法線ベクトル
	this.ndNormal = [];	// 頂点法線ベクトル

	this.makeSurface();

	// マウスでつまむためのメンバ変数
	this.holdNode = [];
	this.mousePosClick = [];
	this.uClick = []; // setBoundaryのためのメンバ, クリック時のUベクトル
	this.gripRad = 10; // setBoudaryにおける周辺拘束領域の半径
}


EditableMesh.prototype.makeSurface = function(){
	// nodeToTriの作成
	this.nodeToTri = new Array(this.posNum);
	for(var i=0; i<this.posNum; i++)
		this.nodeToTri[i] = [];
	for(var i = 0; i < this.tri.length; i++) 
		for(var vert = 0; vert < 3; vert++) 
			this.nodeToTri[this.tri[i][vert]].push(i);

	// surEdge, surToTri, triToSur, sndToSurの作成
	// 四面体についてのループを回し、
	// 四面体の各エッジが現在着目している四面体以外の四面体に共有されているかどうかを調べる
	// (エッジの頂点番号からnodeToTetを参照すれば判定できる)
	// 共有されていなければそれは表面エッジであるとみなす
	var buf = [[0,1,2],[1,2,0],[2,0,1]];
	var n1,n2,n3;	// bufに対応する頂点番号
	var nt1, nt2; // nodeToTetの一次格納変数
	var shareFlag;
	var surCount = 0;
	var v1,v2;	
	this.triToSur = new Array(this.tri.length);
	for(var i = 0; i < this.tri.length; i++) {
		this.triToSur[i] = [];
	}
	for(var i = 0; i < this.tri.length; i++) {
		for(var edg = 0; edg < 3; edg++) {
			shareFlag = false;
			n1 = this.tri[i][buf[edg][0]];
			n2 = this.tri[i][buf[edg][1]];
			nt1 = this.nodeToTri[n1];
			nt2 = this.nodeToTri[n2];
			for(var j = 0; j < nt1.length; j++) {
				for(var k = 0; k < nt2.length; k++) {
					if(shareFlag)break;
					if(nt1[j] === nt2[k] && nt1[j] !== i) {
						shareFlag = true;
					}
				}
			}
			if(!shareFlag) {
				// surEdgeに格納する頂点番号の順番が反時計回りになるようにする
				n3 = this.tri[i][buf[edg][2]];
				v1 = numeric.sub(this.initpos[n1],this.initpos[n3]);
				v2 = numeric.sub(this.initpos[n2],this.initpos[n3]);
				if(v1[0]*v2[1]-v1[1]*v2[0]>0)
					this.surEdge.push([this.tri[i][buf[edg][0]], this.tri[i][buf[edg][1]]]);
				else
					this.surEdge.push([this.tri[i][buf[edg][1]], this.tri[i][buf[edg][0]]]);
				this.surToTri.push(i);
				this.triToSur[i].push(surCount);
				++surCount;
			}
		}
	}

	// surNode, sndToSurの作成
	this.surNode = [];
	var nd, dupFlag;
	for(var edg = 0; edg < this.surEdge.length; edg++) {
		for(var i = 0; i < 2; i++) {
			dupFlag = false;
			nd = this.surEdge[edg][i];
			for(var j = 0; j < this.surNode.length; j++) {
				if(nd === this.surNode[j]) {
					dupFlag = true;
					this.sndToSur[j].push(edg);
					break;
				}
			}
			if(!dupFlag){
				this.surNode.push(nd);
				this.sndToSur.push([edg]);
			}
		}
	}

	// sndToUnDupTriの作成
	this.sndToUnDupTri = new Array(this.surNode.length);
	for(var i=0; i<this.surNode.length; ++i)
		this.sndToUnDupTri[i] = [];
	var nd;
	var dupFlag;
	for(var snd=0; snd<this.surNode.length; ++snd){
		nd = this.surNode[snd];
		for(var ntri=0; ntri<this.nodeToTri[nd].length; ++ntri){
			dupFlag = false;
			// 着目する三角形がsurToTriの中のすべての三角形と重複がなければ
			// 内側三角形リストに追加する
			for(var ond = 0; ond < this.surNode.length; ++ond) {
				for(var edg=0; edg<this.sndToSur[ond].length; ++edg){
					if(this.nodeToTri[nd][ntri] == this.surToTri[this.sndToSur[ond][edg]]){
						dupFlag = true;
						break;
					}
				}
				if(dupFlag)break;
			}
			if(!dupFlag)
				this.sndToUnDupTri[snd].push(this.nodeToTri[nd][ntri]);
		}
	}
}


// クリック時の処理
EditableMesh.prototype.selectHoldNodes = function(mousePos){	

	this.mousePosClick = new Array(mousePos.length);
	for(var i=0; i<mousePos.length; i++){
		this.mousePosClick[i] = new Array(2);
		this.mousePosClick[i][0] = mousePos[i][0];
		this.mousePosClick[i][1] = mousePos[i][1];
	}
		
	this.uClick = new Array(mousePos.length);
	for(var i=0; i<mousePos.length; i++){
		this.uClick[i] = numeric.linspace(0,0,2*this.pos.length);
	}
	
	this.holdNode = new Array(mousePos.length);
	for(var i=0; i<mousePos.length; i++){
		this.holdNode[i] = [];				
	}
	
	var dif;
	var dist;
	var nearNd;
	var minDist;
	for(var cl=0; cl<mousePos.length; cl++){
		dif = numeric.sub(mousePos[cl],this.pos[0]);
		dist = numeric.norm2(dif);
		nearNd = 0;
		minDist =  dist;
		for(var i=1; i<this.pos.length; i++){
			dif = numeric.sub(mousePos[cl],this.pos[i]);
			dist = numeric.norm2(dif);
			if(this.gripRad > dist){
				if(minDist > dist) {
					minDist = dist;
					nearNd = i;
				}
			}
		}
		if(minDist < this.gripRad) {
			this.uClick[cl][2*nearNd] = this.pos[nearNd][0]-this.initpos[nearNd][0];
			this.uClick[cl][2*nearNd+1] = this.pos[nearNd][1]-this.initpos[nearNd][1];
			this.holdNode[cl].push(nearNd);
		}
	}
}


// 境界条件の設定
EditableMesh.prototype.setBoundary = function(clickState, mousePos){
	
	if(mousePos.length != this.holdNode.length)
		this.selectHoldNodes(mousePos);
	
	// クリックノードの境界条件
	if(clickState == "Down"){
		for(var cl=0; cl<mousePos.length; cl++){
			for(var i=0; i<this.holdNode[cl].length; i++){
				var nd = this.holdNode[cl][i];
//				u[2*nd]   = this.uClick[cl][2*nd]+mousePos[cl][0]-this.mousePosClick[cl][0];
//				u[2*nd+1] = this.uClick[cl][2*nd+1]+mousePos[cl][1]-this.mousePosClick[cl][1];
				this.pos[nd][0] = this.initpos[nd][0]+mousePos[cl][0]-this.mousePosClick[cl][0];
				this.pos[nd][1] = this.initpos[nd][1]+mousePos[cl][1]-this.mousePosClick[cl][1];
			}
		}
	}

	// エッジ法線ベクトルの作成
	this.normal = numeric.rep([this.surEdge.length, 2], 0);
	var pe0, pe1;	// エッジの頂点位置ベクトル
	var veclen;
	var normalTmp;
	for(var sur = 0; sur < this.surEdge.length; ++sur) {
		pe0 = this.pos[this.surEdge[sur][0]];
		pe1 = this.pos[this.surEdge[sur][1]];
		normalTmp = [pe1[1] - pe0[1], -(pe1[0] - pe0[0])];
		veclen = numeric.norm2(normalTmp);
		if(veclen===0) continue; // 法線ベクトルの長さがゼロになる場合は前回までの値を採用する
		this.normal[sur] = numeric.div(normalTmp, veclen);
	}

	// 頂点法線ベクトルの作成
	this.ndNormal = numeric.rep([this.surNode.length,2],0);
	var ndNormalTmp, ndNmNorm;
	for(var snd = 0; snd < this.surNode.length; ++snd) {
		ndNormalTmp = [0,0];
		for(var sedg = 0; sedg < this.sndToSur[snd].length; ++sedg) 
			ndNormalTmp = numeric.add(ndNormalTmp, this.normal[this.sndToSur[snd][sedg]]);
		ndNmNorm = numeric.norm2(ndNormalTmp);
		if(ndNmNorm===0)continue; // 法線ベクトルの長さがゼロになる場合は前回までの値を採用する
		this.ndNormal[snd] = numeric.div(ndNormalTmp, ndNmNorm);
	}

}

