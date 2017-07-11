function main()
{
var msk = new  MskDate (); 

var id = 'id';                                   // id клиента в CallTouch
var token = 'token';                             // токен

var unique = 1; // 1 - если нужны уникальные звонки, 0 - если нет
var target = 1; // 1 - если нужны целевые звонки, 0 - если нет
  //Если выбраны в обоих случаях 1, то статистика будет собираться по уникально-целевым звонкам.
  //Если выбраны в обоих случаях 0, то статистика будет собираться по всем звонкам.

var date = msk.yesterday();             // выбираем для ежедневного сбора статистики за вчерашний день
//var date = msk.makeDate(2017,6,30);       // Или задаем дату, с которой начать сбор в формате "год,месяц,день"

// Для того, чтобы выбрать один из двух вариантов, нужно убрать // в начале соответствующей строки и поставить их перед строкой с другим вариантом.

var ss = SpreadsheetApp.openByUrl("google_spreadsheet_url");  //Задаем ссылку на гуглдок для выгрузки статы
ss.setActiveSheet(ss.getSheets()[2]);           // в квадратных скобках указываем номер листа в гугл таблице для записи (нумерация ведется от 0!)

var line = 1;                // номер строки в гуглдоке, с которой начать поиск пустой строки для записи
  while (ss.getRange("A"+line).getValue()!="") {line = line + 1; }

var date_row = "A";      // Столбец для даты
var source_row = "B";    // Столбец для источника
var medium_row = "C";    // Столбец для канала
var campaign_row = "D";  // Столбец для кампании
var call_row = "E";      // Столбец для количества звонков

var Sources = {};

Sources['s1'] = new Source('google','cpc',1,'google','cpc');            //Прописываем с новой строки в скобках через запятую:
Sources['s2'] = new Source('yandex','cpc',1,'yandex','cpc');            // - название источника и тип источника, как они названы в CallTouch
Sources['s3'] = new Source('Гугл.Визитка','',0,'google','cpc');         // - 1 или 0 в зависимости от того, нужна ли стата по этому каналу в разрезе кампаний
Sources['s4'] = new Source('Яндекс.Визитка','',0,'yandex','cpc');       // - название источника и канала, которое мы хотим записать в таблицу
Sources['s5'] = new Source('Facebook_lead','',0,'Facebook_lead','cpc');

//=====================================================================

while (date < msk.today())
  {
            var rqst = request(id,token,date,unique,target); 

            for (var i in Sources)
            {
            Sources[i].count(rqst);
            line = 
Sources[i].write_info(line,date_row,source_row,medium_row,campaign_row,call_row,date,ss);
            Sources[i].set_to_zero();
            }

            date = msk.next_day(date); 
  }

}

//=====================================================================

function MskDate ()
{
this.now = new Date();
this.MILLIS_PER_HOUR = 1000 * 60 * 60;
this.MILLIS_PER_DAY = 1000 * 60 * 60 * 24;
this.msk_time = new Date(this.now.getTime() + 10*this.MILLIS_PER_HOUR);

this.makeDate = function(year,month,day)
  {  return new Date(year,month-1,day);  };

this.today = function()
  {return new Date(this.msk_time.getFullYear(),this.msk_time.getMonth(),this.msk_time.getDate());};

this.yesterday = function()
  { var yes = new Date(this.msk_time.getTime() - this.MILLIS_PER_DAY);
            return new Date(yes.getFullYear(),yes.getMonth(),yes.getDate());
  };

this.next_day = function(date)
  {return new Date(date.getTime() + this.MILLIS_PER_DAY);};

this.write_date = function(date)
  {
            var n = new Date(date);
            return Utilities.formatDate(n, 'Europe/Moscow', 'dd.MM.y');
  };

};

//=====================================================================

function request (id,token,date,unique,target)
{
var d = new Date(date);
var rq1 = 'http://api.calltouch.ru/calls-service/RestAPI/';
var rq2 = '/calls-diary/calls?clientApiId=';
var rq3 = '';

  if(unique==1 && target==1) {rq3 = '&uniqTargetOnly=true';}
  else if(unique==1 && target==0) {rq3 = '&uniqueOnly=true';}
  else if(target==1 && unique==0){ rq3 = '&targetOnly=true';}

var day = d.getDate();
var month = d.getMonth()+1;
var year = d.getFullYear(); 
var date_rq = '&dateFrom='+day+'/'+month+'/'+year+'&dateTo='+day+'/'+month+'/'+year;
var rq = rq1+id+rq2+token+date_rq+rq3;

return UrlFetchApp.fetch(rq).getContentText();
}
//=====================================================================

function Source(source,medium,need_campaign,source_write,medium_write) {
this.source = source;
  if (medium=='') {this.medium =  '<не указано>';}
  else {this.medium = medium;}
this.need_campaign = need_campaign;
this.source_write = source_write;
this.medium_write = medium_write;
this.campaigns = {};

this.count = function(request)
  {
  if (this.need_campaign==0)
  {this.campaigns[this.source] = (request.split('"source":"'+this.source+'","medium":"'+this.medium+'"').length - 1);}

   else if (this.need_campaign==1)
            {
            var camp_search = 0;
            while (request.indexOf('"source":"'+this.source+'","medium":"'+this.medium+'"',camp_search)>0)
            {
            var camp_start = request.indexOf('"utmCampaign":"',request.indexOf('"source":"'+this.source+'","medium":"'+this.medium+'"',camp_search))+15;
            var camp_end = request.indexOf('","',camp_start);
            var campaign = request.substr(camp_start, camp_end-camp_start);
            camp_search = camp_end;
            if (this.campaigns[campaign]>0)
            {this.campaigns[campaign] = this.campaigns[campaign]+1;}
            else {this.campaigns[campaign] = 1;}
            }
            } 
  };

this.write_info = function(line,date_row,source_row,medium_row,campaign_row,call_row,date,ss)
{
  var mosk = new  MskDate (); 
            for (var i in this.campaigns) 
            {
            if (this.campaigns[i] != 0)
            {
            ss.getRange(date_row+line).setValue(mosk.write_date(date));
            ss.getRange(source_row+line).setValue(this.source_write);
            ss.getRange(medium_row+line).setValue(this.medium_write);
            ss.getRange(campaign_row+line).setValue(i);
            ss.getRange(call_row+line).setValue(this.campaigns[i]);
            line = line + 1;
            }
            }
  return line;
};

this.set_to_zero = function()
{
  for (var i in this.campaigns) 
  {  this.campaigns[i]=0; }
}

};
