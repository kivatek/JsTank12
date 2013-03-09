enchant();

// 画面サイズ
var SCREEN_WIDTH	= 320;
var SCREEN_HEIGHT	= 320;
// 戦車の種別
var TANKTYPE_PLAYER	= 0;
var TANKTYPE_ENEMY	= 1;
// 戦車の移動速度
var TANK_SPEED		= 8;
// スプライトのサイズ
var TANK_SIZE		= 32;
var TANK_WIDTH		= 32;
var TANK_HEIGHT		= 32;
// 戦車の弾の移動速度
var SHOT_SPEED		= 8;
// スプライトのサイズ
var SHOT_SIZE		= 16;
var SHOT_WIDTH		= 16;
var SHOT_HEIGHT		= 16;
// 弾を連続で撃つことができないようにする間隔
var INTERVAL_COOLDOWN			= 400;
// 戦車が向きを変えるときの行動制限時間
var INTERVAL_TURNING			= 6;

var Tank = Class.create(Sprite, {
	initialize: function(type,direction){
		Sprite.call(this, TANK_WIDTH, TANK_HEIGHT);
		this.image = game.assets['js/images/chara3.png'];
		this.pattern = 0;
		this.tankType = type;
		this.direction = direction;
		this.isMoving = false;
		this.cooldown = false;
		this.isTurning = false;
		if (type == TANKTYPE_PLAYER) {
			// 緑色の戦車を表すフレーム番号
			this.frame = direction * 6;
			// キー入力の確認や戦車の移動プログラムを登録する。
			this.addEventListener('enterframe', this.updatePlayer);
		} else {
			// デザートカラーの戦車を表すフレーム番号
			this.frame = direction * 6 + 3;
			this.addEventListener('enterframe', this.updateEnemy);
		}
	},
	updatePlayer: function() {
		// 自分の戦車の情報を更新する関数
		if (this.isMoving == false && this.isTurning == false) {
			// 移動方向を表す情報をクリアする。
			this.vx = this.vy = 0;

			// 入力チェック前の向きを覚えておく。
			var prevDirection = this.direction;

			// キーの入力状態をチェックする。
			// 入力状態に合わせて戦車の向き情報を変更する。
			// 向き 0:下、1:左、2:右、3:上
			if (game.input.left) {
				this.direction = 1;
				this.vx = -1;
			} else if (game.input.right) {
				this.direction = 2;
				this.vx = 1;
			} else if (game.input.up) {
				this.direction = 3;
				this.vy = -1;
			} else if (game.input.down) {
				this.direction = 0;
				this.vy = 1;
			} else if (game.input.a) {
				this.doShot();
			} else if (game.input.b) {
			}

			if (prevDirection != this.direction) {
				// 向きを変えた直後は動けないことにする。
				// これによりキーをちょっと押すだけならばその場で向きを変えることが出来るようになる。
				this.doTurn();
			} else {
				// 向きと移動方向が同じ場合はその方向へ向かって動き始める。
				if (this.vx || this.vy) {
					// 移動処理を行った後の座標を仮計算。
					// １ブロック前へ進むことができるかどうかを調べる。
					if (this.checkFront()) {
						// １ブロック分移動した後の座標がステージの範囲内であれば移動処理を開始する。
						var x = this.x + this.vx * TANK_SIZE;
						var y = this.y + this.vy * TANK_SIZE;
						this.doMove(x, y);
					}
				}
			}
		}
	},
	updateEnemy: function() {
		// 敵戦車の情報を更新する関数
		// キー入力ではなくどのように動くかをプログラムで考えます。
		if (this.isMoving == false && this.isTurning == false) {
			// 移動方向を表す情報をクリアする。
			this.vx = this.vy = 0;

			// 行動変更前の向きを覚えておく。
			var prevDirection = this.direction;
			
			// 向きを変えるか進むかを決定する。
			this.direction = this.algoAction();
			if (this.cooldown) {
				return;
			}

			if (prevDirection != this.direction) {
				// 向きを変えた直後は動けないことにする。
				// これによりキーをちょっと押すだけならばその場で向きを変えることが出来るようになる。
				this.doTurn();
			} else {
				this.setVector(this.direction);
				if (this.vx || this.vy) {
					// 移動処理を行った後の座標を仮計算。
					// そしてその座標が画面内であるかどうか、壁があるかどうかを調べる。
					if (this.checkFront()) {
						var x = this.x + this.vx * TANK_SIZE;
						var y = this.y + this.vy * TANK_SIZE;
						// 一ブロック分移動した後の座標がステージの範囲内であれば移動処理を開始する。
						this.doMove(x, y);
					}
				}
			}
		}
	},
	doTurn: function() {
		this.isTurning = true;
		// 向きが変わった場合は使用する絵の番号を更新。
		if (this.tankType == TANKTYPE_PLAYER) {
			this.frame = this.direction * 6 + this.pattern;
		} else {
			this.frame = this.direction * 6 + this.pattern + 3;
		}
		// Timeline機能を使って向きを変えた後の硬直処理を行う。
		this.tl
			.delay(INTERVAL_TURNING)
			.then(function() {
				this.isTurning = false;
			});
	},
	doMove: function(x, y) {
		this.isMoving = true;
		// Timeline機能を使って移動処理を行う。
		this.tl
			.moveTo(x, y, 4, enchant.Easing.LINEAR)
			.and()
			.repeat(function() {
				// ４方向、３パターンのうちどのフレームを使うかを計算する。
				this.pattern = (this.pattern + 1) % 3;
				if (this.tankType == TANKTYPE_PLAYER) {
					this.frame = this.direction * 6 + this.pattern;
				} else {
					this.frame = this.direction * 6 + this.pattern + 3;
				}
			}, 4)
			.then(function() {
				this.isMoving = false;
			});
	},
	doShot: function() {
		// 弾を撃つ。つまり弾スプライトを発生する。
		if (this.cooldown == false) {
			this.cooldown = true;
			// スプライトのサイズが違うため、戦車の座標をそのまま使うことができない。
			// そのため弾の座標を特別に計算する。
			var shot = new Shot(this.x+((TANK_SIZE-SHOT_SIZE)/2), this.y+((TANK_SIZE-SHOT_SIZE)/2), this.tankType, this.direction);
			// 弾はshotGroupへ追加するようにします。
			shotGroup.addChild(shot);
			// 弾は間隔を空けないと撃てないよう修正。
			// 冷却時間つまりcooldownがtrueの間は次の弾を撃つことは出来ないようにする。
			var timerTarget = this;
			setTimeout( function(){
				timerTarget.cooldown = false;
			}, INTERVAL_COOLDOWN);
		}
	},
	algoAction: function() {
		
		if (this.searchTank(myTank)) {
			this.doShot();
			return this.direction;
		}
		
		// ランダムに次の行動を決定する。
		// ようするにサイコロをふって向きを変えるか進むかを決める。
		var change = Math.floor(Math.random() * 100);
		if (change < 66) {
			// 乱数が66未満の場合は今の向きに進む。
			// ただし行き止まりであれば向きを変える。
			this.setVector(this.direction);
			if (this.checkFront()) {
				return this.direction;
			}
		}
		if (change < 80) {
			return this.direction;
		}
		// 
		for (var i = 0; i < 10; i++) {
			// 次に進む方向を乱数で決める。
			// 今と同じ向きという答えであればもう一度計算する。
			// ただしいつまでも答えが決まらない可能性があるので計算するのは最高10回まで。
			var newDirection = Math.floor(Math.random() * 4);
			if (newDirection != this.direction) {
				this.setVector(newDirection);
				if (this.checkFront()) {
					return newDirection;
				}
			}
		}
		return this.direction;
	},
	searchTank: function(tank) {
		// 正面の見える範囲にプレイヤー戦車がいるかどうかを調べる
		var result = false;
		this.setVector(this.direction);
		for (var loop = 1; loop < 10; loop++) {
			var x = this.x + this.vx * loop * TANK_SIZE;
			var y = this.y + this.vy * loop * TANK_SIZE;
			if (this.checkFront() == true) {
				if (tank.x <= x && x < (tank.x+TANK_SIZE) && tank.y <= y && y < (tank.y+TANK_SIZE)) {
					result = true;
				}
			}
		}
		// プレイヤー戦車を探す際に使った変数を元に戻しておく。
		this.vx = this.vy = 0;
		return result;
	},
	checkFront: function() {
		// １ブロック前へ進むことができるかどうかを調べる。
		var x = this.x + this.vx * TANK_SIZE;
		var y = this.y + this.vy * TANK_SIZE;
		return (0 <= x && x < SCREEN_WIDTH && 0 <= y && y < SCREEN_HEIGHT && !background.hitTest(x, y));
	},
	setVector: function(direction) {
		// 方向を表す値から進行方向の座標変更値を求める。
		// 向き 0:下、1:左、2:右、3:上
		if (direction == 1) {
			this.vx = -1;
			this.vy = 0;
		} else if (direction == 2) {
			this.vx = 1;
			this.vy = 0;
		} else if (direction == 3) {
			this.vx = 0;
			this.vy = -1;
		} else if (direction == 0) {
			this.vx = 0;
			this.vy = 1;
		}
	}
});

var Shot = Class.create(Sprite, {
	initialize: function(x,y,type,direction){
		Sprite.call(this, SHOT_WIDTH, SHOT_HEIGHT);
		this.image = game.assets['js/images/icon0.png'];
		this.x = x;
		this.y = y;
		this.shotType = type;
		// 使用する弾画像のフレーム番号をセット。
		var topFrame = 0;
		if (type == TANKTYPE_PLAYER) {
			topFrame = 48;
		} else {
			topFrame = 56;
		}
		// 向きは戦車と同じ情報を受け取る。しかし画像の格納順は一致していない。
		// 0:下、1:左、2:右、3:下
		this.vx = this.vy = 0;
		if (direction == 0) {
			this.frame = topFrame + 4;
			this.vy = 1;
		} else if (direction == 1) {
			this.frame = topFrame + 2;
			this.vx = -1;
		} else if (direction == 2) {
			this.frame = topFrame + 6;
			this.vx = 1;
		} else if (direction == 3) {
			this.frame = topFrame;
			this.vy = -1;
		}
		this.addEventListener('enterframe', function() {
			// スクリーンの端かまたは何かに当たるまで飛んでいく。
			if (this.checkCollision() == true) {
				// 何かに衝突したらこれ以上は処理をしない。
				return;
			}
			// フレーム毎にやることが増えてくるとプログラムが見づらくなる。
			// そのときに備えて移動処理を関数へ変更。
			this.move();
		});
	},
	move: function() {
		this.moveBy(this.vx * SHOT_SPEED, this.vy * SHOT_SPEED);
	},
	checkCollision: function() {
		// collision: 「コリジョン」とはモノとモノとの衝突といった意味です。
		if (!isInsideScreen(this.x, this.y)) {
			// 現在座標がすでに画面外であればステージから削除する。
			// この時点でこの弾スプライトはゲーム内に存在しなくなる。
			shotGroup.removeChild(this);
			return true;
		}
		
		if (this.shotType == TANKTYPE_PLAYER) {
			var i;
			for (i = 0; i < enemies.length; i++) {
				if (this.intersect(enemies[i])) {
					// enchant.jsの関数intersectを使ってスプライトが重なっているかをチェックします。
					// 敵戦車に当たったら弾を消す。
					// 2012/12/10時点では敵戦車へ当たったことを伝える処理は実装していない。
					shotGroup.removeChild(this);
					return true;
				}
			}
		} else {
			if (this.intersect(myTank)) {
				// enchant.jsの関数intersectを使ってスプライトが重なっているかをチェックします。
				// プレイヤー戦車に当たったら弾を消す。
				// 2012/12/10時点ではプレイヤー戦車へ当たったことを伝える処理は実装していない。
				shotGroup.removeChild(this);
				return true;
			}
		}
		
		if (background.hitTest(this.x, this.y)) {
			// enchant.jsの関数hitTestを使って地形の衝突判定を行います。
			// レンガなど障害物にあたった場合の処理。
			shotGroup.removeChild(this);
			return true;
		}
		
		return false;
	}
});

function isInsideScreen(x, y) {
	if (0 <= x && x < SCREEN_WIDTH && 0 <= y && y < SCREEN_HEIGHT) {
		return true;
	}
	return false;
}

function loadLevel(){
	backgroundMap = [
		[0,0,0,0,0,0,0,0,0,0],
		[0,1,1,0,0,0,0,1,1,0],
		[0,1,0,0,0,1,0,0,1,0],
		[0,0,0,1,0,0,1,0,0,0],
		[0,1,1,0,0,0,0,0,0,0],
		[0,0,0,0,0,0,0,1,1,0],
		[0,0,0,1,0,0,1,0,0,0],
		[0,1,0,0,1,0,0,0,1,0],
		[0,1,1,0,0,0,0,1,1,0],
		[0,0,0,0,0,0,0,0,0,0]
	];
	
	background = new Map(32, 32);
	background.image = game.assets['js/images/tankmap.png'];
	background.loadData(backgroundMap);
	background.collisionData = backgroundMap;
}

window.onload = function() {
	
	game = new Game(SCREEN_WIDTH, SCREEN_HEIGHT);
	
	game.fps = 24;
	game.touched = false;
	game.preload('js/images/chara3.png', 'js/images/icon0.png', 'js/images/tankmap.png');
	game.keybind(90, 'a');      // ＺキーをＡボタンとみなす
	game.keybind(88, 'b');      // ＸキーをＢボタンと見なす
	
	enemies = [];	// 敵タンクの情報を保持する配列

	game.onload = function() {
		game.currentScene.backgroundColor = 'rgb(239, 228, 202)';

		loadLevel();
		
		// 緑色の戦車（自分用）のスプライトを用意。
		myTank = new Tank(TANKTYPE_PLAYER, 0);
		// 表示位置の指定
		myTank.x = 0;
		myTank.y = 0;
		
		// デザートカラーの戦車（敵用）のスプライトを用意。
		var teki = new Tank(TANKTYPE_ENEMY, 1);
		// 表示位置の指定
		teki.x = 288;
		teki.y = 288;
		
		enemies.push(teki);

		// 用意したスプライト、バックグラウンドをシーンに関連づける。シーンはスクラッチで言えばステージのこと。
		// これで表示されるようになる。
		game.currentScene.addChild(background);
		// スプライト表示を管理しやすいようにグループを分ける。
		tekiGroup = new Group();
		myTankGroup = new Group();
		shotGroup = new Group();
		game.currentScene.addChild(tekiGroup);
		game.currentScene.addChild(myTankGroup);
		game.currentScene.addChild(shotGroup);
		
		// 戦車スプライトは用意したグループへ登録するようにする。
		tekiGroup.addChild(teki);
		myTankGroup.addChild(myTank);
	};
	game.start();
};
