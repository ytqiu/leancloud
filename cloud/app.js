// 在 Cloud code 里初始化 Express 框架
var express = require('express');
//var bodyParser = require('body-parser');
var xmlBodyParser = require('express-xml-parser');
var app = express();
var crypto = require('crypto')
var http = require('http')
var https = require('https')
var eventActions = {
    'CLICK': {
        'ACTION_UP': function (data) {
            console.log('ACTION_UP');
        }
    },
    'scancode_push': {
        'ACTION_TODAY': function (data) {
            console.log('SP_TODAY: ' + data.xml.ScanCodeInfo);
        }
    }
};

// App 全局配置
app.set('views','cloud/views');   // 设置模板目录
app.set('view engine', 'ejs');    // 设置 template 引擎
app.use(express.bodyParser());    // 读取请求 body 的中间件
app.use(xmlBodyParser({type: 'text/xml'}));
//app.use(bodyParser.json());
//app.use(bodyParser.urlencoded({ extended: true }));
//console.log(express.bodyParser);
console.log(xmlBodyParser)

var accessToken = null;
//app.use(function(req, res, next) {
//
//    //next(req, res);
//});

// 使用 Express 路由 API 服务 /hello 的 HTTP GET 请求
app.get('/hello', function(req, res) {
  res.render('hello', { message: 'Congrats, you just set up your app!^^' });
});

app.get('/wechat', function(req, res) {
  console.log("wechat.get.query: " + JSON.stringify(req.query));
  console.log("wechat.get.body: " + req.body);
  console.log("wechat.get.echostr: " + req.param("echostr"));
  res.send(req.param("echostr"));
});

if (accessToken == null) {
    var options = {
        hostname: 'api.weixin.qq.com',
        port: '443',
        path: '/cgi-bin/token?grant_type=client_credential&appid=wx2e6744f169e39c34&secret=3f44ab4ad7ecc41f2b9dbc37344042c7',
        method: 'get'
    };
    var areq = https.request(options, function (ares) {
        console.log("ares.status: " + ares.statusCode)
        ares.setEncoding('utf-8')
        var result = "";
        ares.on('data', function (chunk) {
            result += chunk;
        });
        ares.on('end', function () {
            accessToken = JSON.parse(result).access_token;
        })
    });
    areq.end();
    console.log("areq: " + areq);
}

app.post('/wechat', function(req, res) {
    console.log("wechat.post.type: " + req.get('Content-Type'));
  console.log("wechat.post.query: " + JSON.stringify(req.query));
  console.log("wechat.post.body: " + JSON.stringify(req.body));
    var data = req.body;
  /*if (req.param("nonce") != null) {
   console.log("wechat.nonce: " + req.param("nonce"));
   res.send(req.param("nonce"));
   return;
   }*/
    // parseInt(Date.now()/1000)
    console.log("calc sign: " + calcSig("aaaaaa", req.param("timestamp"), req.param("nonce")) + " req.sign: " + req.param("signature"));
  //res.send('<?xml version="1.0"?><xml><ToUserName><![CDATA[' + data.xml.FromUserName + ']]></ToUserName><FromUserName><![CDATA[gh_6a3f02b16af5]]></FromUserName><CreateTime>' + parseInt(Date.now() / 1000) + '</CreateTime><MsgType><![CDATA[text]]></MsgType><Content><![CDATA[' + data.xml.Content + ']]></Content></xml>');
    //res.send('<?xml version="1.0"?><xml><ToUserName><![CDATA[' + data.xml.FromUserName + ']]></ToUserName><FromUserName><![CDATA[gh_6a3f02b16af5]]></FromUserName><CreateTime>' + parseInt(Date.now() / 1000) + '</CreateTime><MsgType><![CDATA[text]]></MsgType><Content><![CDATA[' + data.xml.Content + ']]></Content></xml>');
    res.send('');

    //process.nextTick(function () {
    //
    //});
    //setInterval(function () {
    //
    //}, 5);
    setTimeout(function () {
        console.log("send message");
        // {"xml":{"ToUserName":["gh_6a3f02b16af5"],"FromUserName":["oruuNuAUUdskD0XqHm14iX7HNmVU"],"CreateTime":["1441522285"],"MsgType":["event"],"Event":["CLICK"],"EventKey":["ACTION_UP"]}}
        // {"xml":{"ToUserName":["gh_6a3f02b16af5"],"FromUserName":["oruuNuAUUdskD0XqHm14iX7HNmVU"],"CreateTime":["1441522404"],"MsgType":["event"],"Event":["scancode_push"],"EventKey":["ACTION_TODAY"],"ScanCodeInfo":[{"ScanType":["qrcode"],"ScanResult":["http://www.baidu.com"]}]}}

        if (data.xml.MsgType == 'event') {
            console.log('receive event: ' + data.xml.Event);
            eventActions[data.xml.Event][data.xml.EventKey](data);
        }

        var sdata = '{"touser":"' + data.xml.FromUserName + '","msgtype":"text","text":{"content":"' + data.xml.Content + '"}}';
        var options = {
            hostname: 'api.weixin.qq.com',
            port: '443',
            path: '/cgi-bin/message/custom/send?access_token=' + accessToken,
            method: 'post',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': sdata.length
            }
        };
        var sreq = https.request(options, function (sres) {
            console.log("sres.statusCode: " + sres.statusCode);
            var result = '';
            sres.on('data', function (chunk) {
                result += chunk;
            });
            sres.on('end', function () {
                console.log('sres.result: ' + result);
            });
        });

        sreq.write(sdata);
        sreq.end()
    }, 5000);
});

function calcSig(token, timestamp, nonce) {
    var s = [token, timestamp, nonce].sort().join('')
    return crypto.createHash('sha1').update(s).digest('hex')
}

// 最后，必须有这行代码来使 express 响应 HTTP 请求
app.listen();
