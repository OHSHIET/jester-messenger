from django import template

register = template.Library()

@register.filter
def replaceImgUrl(url):
    return str(url).replace('messenger/', '', 1)
