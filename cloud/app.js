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
        'ACTION_UP': function (data, res) {
            console.log('ACTION_UP');
            //<xml><ToUserName><![CDATA[touser]]></ToUserName><FromUserName><![CDATA[fromuser]]></FromUserName><CreateTime>1399197672</CreateTime><MsgType><![CDATA[transfer_customer_service]]></MsgType></xml>
            res.send('<xml><ToUserName><![CDATA[' + data.xml.FromUserName + ']]></ToUserName><FromUserName><![CDATA[' + data.xml.ToUserName + ']]></FromUserName><CreateTime>' + parseInt(Date.now() / 1000) + '</CreateTime><MsgType><![CDATA[transfer_customer_service]]></MsgType></xml>');
        }
    },
    'scancode_push': {
        'ACTION_TODAY': function (data, res) {
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
console.log(express.bodyParser);
console.log(xmlBodyParser)

var accessToken = null;
var jsapiTicket = null;
//app.use(function(req, res, next) {
//
//    //next(req, res);
//});

// 使用 Express 路由 API 服务 /hello 的 HTTP GET 请求
app.get('/hello', function(req, res) {
  res.render('hello', { message: 'Congrats, you just set up your app!^^' });
});

app.get('/oauth', function(req, res) {
    console.log('oauth.query: ' + JSON.stringify(req.query));
    res.send(JSON.stringify({code: req.query.code, state: req.query.state}));
});

app.get('/jssdk.html', function (req, res) {
    var noncestr = '123456789j0'
    var timestamp = '' + parseInt(Date.now() / 1000)
    var url = 'http://dev.xitai.avosapps.com' + req.originalUrl
    console.log('host: ' + req.hostname + ' -path: ' + req.path + ' -url: ' + url + ' -originalUrl: ' + req.originalUrl)

    res.render('jssdk', {
        noncestr: noncestr,
        timestamp: timestamp,
        url: url,
        jsapi_ticket: jsapiTicket,
        signature: calcSdkSig(jsapiTicket, noncestr, timestamp, url)
    });
});

app.post('/test/post', function (req, res) {
    console.log('test.post: ' + JSON.stringify(req.body));
    res.send('body: ' + JSON.stringify(req.body));
});

app.get('/wechat', function(req, res) {
  console.log("wechat.get.query: " + JSON.stringify(req.query));
  console.log("wechat.get.body: " + req.body);
  console.log("wechat.get.echostr: " + req.param("echostr"));
  res.send(req.param("echostr"));
});

app.get('/ops/addkf', function(req, res) {
    console.log('weops.addkf: ' + req.param('name') + ' - ' + req.param('nick'))
    // {"kf_account":"test1@test","nickname":"客服1","password":"pswmd5",}
    postToWXS('https://api.weixin.qq.com/customservice/kfaccount/add?access_token=' + accessToken, {
        kf_account: '' + req.param('name') + '@邱亚涛的接口测试账号',
        nickname: '' + req.param('nick'),
        password: 'test1234'
    }, function (result) {
        console.log('weops.addkf result: ' + result)
        res.send(result)
    })
});

function postToWXS(path, data, callback) {
    var rdatastr = JSON.stringify(data);
    console.log('postToWXS: ' + rdatastr + ' - ' + rdatastr.length);
    var options = {
        hostname: 'api.weixin.qq.com',
        port: 443,
        path: path,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'//,
            //'Content-Length': rdatastr.length + 1
        }
    };

    var request = https.request(options, function (res) {
        var result = '';
        res.on('data', function (chunk) {
            result += chunk;
        }).on('end', function () {
            callback(result);
        });
    });

    request.write(rdatastr);
    //request.write('{"touser":"oruuNuAUUdskD0XqHm14iX7HNmVU","msgtype":"text","text":{"content":"<a href=\"http://dev.xitai.avosapps.com/oauth\">你好</a>"}}');
    request.end();
    return request;
}

function getToWXS(path, callback) {
    var options = {
        hostname: 'api.weixin.qq.com',
        port: 443,
        path: path,
        method: 'get'
    }
    var request = https.request(options, function (res) {
        var result = ''
        res.on('data', function (chunk) {
            result += chunk
        }).on('end', function () {
            callback(result)
        })
    })
    request.end()
    return request
}

if (accessToken == null) {
    //var options = {
    //    hostname: 'api.weixin.qq.com',
    //    port: '443',
    //    path: '/cgi-bin/token?grant_type=client_credential&appid=wx2e6744f169e39c34&secret=3f44ab4ad7ecc41f2b9dbc37344042c7',
    //    method: 'get'
    //};
    //var areq = https.request(options, function (ares) {
    //    console.log("ares.status: " + ares.statusCode)
    //    ares.setEncoding('utf-8')
    //    var result = "";
    //    ares.on('data', function (chunk) {
    //        result += chunk;
    //    });
    //    ares.on('end', function () {
    //        accessToken = JSON.parse(result).access_token;
    //    })
    //});
    //areq.end();
    //console.log("areq: " + areq);
    getToWXS('/cgi-bin/token?grant_type=client_credential&appid=wx2e6744f169e39c34&secret=3f44ab4ad7ecc41f2b9dbc37344042c7', function (result) {
        console.log('access token result: ' + result)
        accessToken = JSON.parse(result).access_token;

        if (accessToken != null) {
            getToWXS('/cgi-bin/ticket/getticket?access_token=' + accessToken + '&type=jsapi', function (result) {
                console.log('jsapi ticket result: ' + result);
                jsapiTicket = JSON.parse(result).ticket;
            });
        }
    })
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
    res.send('<?xml version="1.0"?><xml><ToUserName><![CDATA[' + data.xml.FromUserName + ']]></ToUserName><FromUserName><![CDATA[gh_6a3f02b16af5]]></FromUserName><CreateTime>' + parseInt(Date.now() / 1000) + '</CreateTime><MsgType><![CDATA[text]]></MsgType><Content><![CDATA[' + data.xml.Content + ']]></Content></xml>');

    if (data.xml.MsgType == 'event') {
        console.log('receive event: ' + data.xml.Event);
        eventActions[data.xml.Event][data.xml.EventKey](data, res);
        return;
    }

    //res.send('');

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

        //var sdata = '{"touser":"' + data.xml.FromUserName + '","msgtype":"text","text":{"content":"' + data.xml.Content + '"}}';
                    //'{"touser":["oruuNuAUUdskD0XqHm14iX7HNmVU"],"msgtype":"text","text":{"content":["/::@"]}}'
        var sdata = {
            touser: '' + data.xml.FromUserName,
            msgtype: 'text',
            text: {
                content: '<a href="https://open.weixin.qq.com/connect/oauth2/authorize?appid=wx2e6744f169e39c34&redirect_uri=http%3a%2f%2fdev.xitai.avosapps.com%2foauth&response_type=code&scope=snsapi_userinfo&state=111#wechat_redirect">你好</a>\n' + data.xml.Content
            }
        };
        //var options = {
        //    hostname: 'api.weixin.qq.com',
        //    port: '443',
        //    path: '/cgi-bin/message/custom/send?access_token=' + accessToken,
        //    method: 'post',
        //    headers: {
        //        'Content-Type': 'application/json',
        //        'Content-Length': sdata.length
        //    }
        //};
        //var sreq = https.request(options, function (sres) {
        //    console.log("sres.statusCode: " + sres.statusCode);
        //    var result = '';
        //    sres.on('data', function (chunk) {
        //        result += chunk;
        //    });
        //    sres.on('end', function () {
        //        console.log('sres.result: ' + result);
        //    });
        //});
        //
        //sreq.write(sdata);
        //sreq.end()
        postToWXS('/cgi-bin/message/custom/send?access_token=' + accessToken, sdata, function (result) {
            console.log('send message result: ' + result)
        })
    }, 1000);
});

function calcSig(token, timestamp, nonce) {
    var s = [token, timestamp, nonce].sort().join('')
    return crypto.createHash('sha1').update(s).digest('hex')
}

function calcSdkSig(ticket, nonce, timestamp, url) {
    var s = ['jsapi_ticket=' + ticket, 'noncestr=' + nonce, 'timestamp=' + timestamp, 'url=' + url].sort().join('&')
    return crypto.createHash('sha1').update(s).digest('hex')
}

// 最后，必须有这行代码来使 express 响应 HTTP 请求
app.listen();
