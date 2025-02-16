var node_host = "https://eosbp.atticlab.net"
var ii = 0;
var favorites = [{
    owner: 'atticlabeosb',
    checked: true,
}, {
    owner: 'cryptolions1',
    checked: true,
}, {
    owner: 'tokenika4eos',
    checked: true,
}, {
    owner: 'eosnodeonebp',
    checked: true,
}, {
    owner: 'eosfishrocks',
    checked: true,
}, {
    owner: 'eosvenezuela',
    checked: true,
}, {
    owner: 'philippinebp',
    checked: true,
}, {
    owner: 'eosphereiobp',
    checked: true,
}, ]

var app = {
    template: null,
    producers: null,
    errors: [],
    chainId: null,
    blockNum: null,
    blockPrefix: null,
    eos: null,
    accInfo: {},
    init: function() {
        var ttl = 1000

        app.eos = Eos({
            httpEndpoint: node_host
        });

        this.loadChainData()
        this.loadProducers()
        this.loadTemplate()

        $("#reload").click(function(e) {
            window.location.reload();
        })

        $("#generate").click(function(e) {
            e.preventDefault();
            app.generate()
        })

        $("#submit").click(function(e) {
            e.preventDefault();
            app.submit()
        })

        $('#account').on('input', function() {
            clearTimeout(this.delayer);

            var context = this;
            this.delayer = setTimeout(function() {
                $(context).trigger('change');
            }, 1000);
        });

        $('body').on('input', '#myRange', function() {
            $('#rangeVal').html($(this).val() + " EOS");
        })

        $("#account").change(function(e) {
            $("#account").removeClass("input-error");
            e.preventDefault();

            app.accInfo = {};

            app.getAccountData($("#account").val()).then(function(info) {
                app.accInfo = info;

                var html = '';
                html += '<div class="nfo"><strong>Cpu Staked: </strong>' + app.accInfo.cpuWeight + '</div>';
                html += '<div class="nfo"><strong>Net Staked: </strong>' + app.accInfo.netWeight + '</div>';
                html += '<div class="nfo"><strong>Balance: </strong>' + app.accInfo.balance + '</div>';

                var limit = 10;
                if (app.accInfo.balance > limit) {
                    var v = app.accInfo.balance - limit;
                    html += '<div class="slidecontainer"><input type="range" step="0.01" min="0" max="' + v + '" value="' + v + '" class="slider" id="myRange"></div>';
                    html += '<span class="nfo"><strong>I want to stake: </strong><span id="rangeVal">' + v + '</span></span>';
                }

                $("#info-data").html(html);
                $("#info").show();
            }).catch(function(err) {
                $("#info").hide();
                $("#account").addClass("input-error");
                console.log(err);
            })
        })

        setTimeout(function tickerr() {
            if (app.errors.length > 0) {
                $('.loader').hide();
                $('.form').hide();

                for (var i = 0; i < app.errors.length; i++) {
                    $('.errors').find('div').append(app.errors[i])
                }

                $('.errors').show();
                return
            }
            setTimeout(tickerr, ttl);
        }, ttl);


        setTimeout(function tick() {
            if (app.template != null && app.producers != null && app.chainId != null && app.blockNum != null && app.blockPrefix != null) {
                $("#chainid").html(app.chainId);
                $("#blocknum").html(app.blockNum);
                $("#blockprefix").html(app.blockPrefix);

                $('.loader').hide();
                $('.form').show();
                return
            }

            setTimeout(tick, ttl);
        }, ttl);
    },
    calculateVoteWeight: function () {
        let timestamp_epoch = 946684800000;
        let dates_ = (Date.now() / 1000) - (timestamp_epoch / 1000);
        let weight_ = Math.floor(dates_ / (86400 * 7)) / 52;  //86400 = seconds per day 24*3600
        return Math.pow(2, weight_);
    },
    loadProducers: function() {
        $.ajax({
                type: "POST",
                url: node_host + "/v1/chain/get_table_rows",
                data: JSON.stringify({
                    "json": true,
                    "code": "eosio",
                    "scope": "eosio",
                    "table": "producers",
                    "limit": 700,
                    "table_key": ""
                }),
                contentType: "application/json",
                success: function(data) {
                    var p = data.rows;
                    p.sort(function(a, b) {
                        return b.total_votes - a.total_votes;
                    });

                    app.producers = p;
                    for (let index in app.producers) {
                        app.producers[index].numVotes = numeral((app.producers[index].total_votes / app.calculateVoteWeight() / 10000).toFixed(0)).format("0,000");
                        var pos = favorites.find((obj) => obj.owner === app.producers[index].owner);
                        if (pos) {
                             favorites[favorites.indexOf(pos)].numVotes = app.producers[index].numVotes;
                        }
                    }

                    app.producers = app.producers.slice(0, 100);
                }
            })
            .fail(function() {
                app.errors.push("Cannot load producers");
            })
    },
    getAccountData: function(name) {
        var accInfo = {
            cpuWeight: null,
            netWeight: null,
            balance: null,
        }

        return new Promise(function(resolve, reject) {
            $.ajax({
                    type: "POST",
                    url: node_host + "/v1/chain/get_account",
                    data: JSON.stringify({
                        account_name: name
                    }),
                    contentType: "application/json",
                    success: function(data) {
                        accInfo.cpuWeight = app.eos2float(data.total_resources.cpu_weight);
                        accInfo.netWeight = app.eos2float(data.total_resources.net_weight);
                        resolve();
                    }
                })
                .fail(function() {
                    reject("Cannot load producers")
                })
        }).then(function() {
            return app.eos.getCurrencyBalance('eosio.token', name, 'EOS')
        }).then(function(result) {
            if (!result[0]) {
                throw new Error("Cannot get balance for acc: " + name)
            }

            accInfo.balance = app.eos2float(result[0])

            return accInfo;
        })
    },
    eos2float: function(v) {
        return parseFloat(v.replace(/[^0-9\.]/g, ''));
    },
    loadChainData: function(eos) {
        app.eos.getInfo({}).then(function(result) {
            if (result.chain_id != "aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906") {
                app.errors.push("Chain id != aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906")
                return
            }

            app.chainId = result.chain_id;

            app.eos.getBlock(result.last_irreversible_block_num).then(
                function(result) {
                    app.blockNum = result.block_num;
                    app.blockPrefix = result.ref_block_prefix;
                }
            )
        }, function(e) {
            app.errors.push("Cannot load chain data: <br>" + e.message);
        });
    },
    loadTemplate: function() {
        $.get("./offline.html")
            .done(function(data) {
                app.template = data
            })
            .fail(function() {
                app.errors.push("Cannot load template");
            })
    },
    generate: function() {
        var acc = $("#account").val();
        var stake = $('#rangeVal').html()
        if (!stake) {
            stake = 0
        } else {
            stake = app.eos2float(stake)
        }

        var html = app.template

        html = html.replace("#ACCOUNT#", acc);
        html = html.replace("#STAKE#", stake);
        html = html.replace("#CHAINID#", app.chainId);
        html = html.replace("#BLOCKNUM#", app.blockNum);
        html = html.replace("#BLOCKPREFIX#", app.blockPrefix);

        // Producers
        html = html.replace("#FAV#", app.genProducerHtml(favorites));
        html = html.replace("#FAV21#", app.genProducerHtml(app.producers.slice(0, 20)));
        html = html.replace("#FAV100#", app.genProducerHtml(app.producers.slice(21)));

        app.download("secure-vote.html", html);

    },
    submit: function() {
        try {
            var tx = $("#txdata").val();
            if (tx == "") {
                throw new Error("Bad tx data");
            }

            var raw_transaction = JSON.parse(tx);
            Eos({
                httpEndpoint: node_host,
                broadcast: true,
            }).pushTransaction(raw_transaction).then(
                function(result) {
                    $(".loader").hide();
                    $(".errors").hide();
                    $("#section4 .centering").hide();

                    $("#txid").html("Transaction id: " + result.transaction_id);
                    $(".success").show();
                },
            ).catch(function(error) {
                app.errors.push("Error publishing: <br>" + error);
            })
        } catch (error) {
            app.errors.push("Error publishing: <br>" + error);
        }
    },

    genProducerHtml: function(producers) {
        var html = "";

        function checkEvent(event) {}
        for (var i = 0; i < producers.length; i++) {
            var checked = producers[i].checked ? 'checked="checked"' : "";

            var isNotFavourite = false;
            if (!checked) {
                if (favorites.find((obj) => obj.owner === producers[i].owner)) {
                    checked = 'checked="checked"';
                    isNotFavourite = true;
                }
            }
            html += '<li' + (isNotFavourite ? " class=\"favourites\"" : "") + '><input type="checkbox" id="a' + ii + '" ' + checked + ' value="' + producers[i].owner + '" class="bp' + (checked ? " " + producers[i].owner : "") + '"' + (checked ? "onchange=\"checkEvent(this)\"" : "") + '><label class="checklabel" for="a' + ii + '"> '  + producers[i].owner + " - " + producers[i].numVotes + '</label></li>';
            ii++;
        }

        return html
    },
    download: function(filename, text) {
        var element = document.createElement('a');
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
        element.setAttribute('download', filename);
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    }
}

$(function() {
    app.init()
})
