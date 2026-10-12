with open('src/pages/WorkoutPage.tsx', 'r') as f:
    content = f.read()

# Fix 1: Lines 1400-1401
# Old:
#                     }
#                   })}}
# New:
#                     })
#                   ))}
old1 = """                    }
                  })}}"""
new1 = """                    })
                  ))}"""
count1 = content.count(old1)
print(f"Fix 1: found {count1} occurrences")
if count1 == 1:
    content = content.replace(old1, new1)
elif count1 == 2:
    print("Warning: Fix 1 matched 2 occurrences, replacing all")

# Fix 2: Lines 1502-1503
# Old:
#                     }
#                   })}}
# New:
#                     })
#                   ))}
old2 = """                      setElapsed(0)
                    }
                  })}}"""
new2 = """                      setElapsed(0)
                    })
                  ))}"""
count2 = content.count(old2)
print(f"Fix 2: found {count2} occurrences")
if count2 == 1:
    content = content.replace(old2, new2)
elif count2 == 2:
    print("Warning: Fix 2 matched 2 occurrences, replacing all")

# Fix 3: Lines 1664-1673 (map region)
# Old:
#                           </button>                      </div>
#                     ))}
#                   </div>
#                   <Button ...>
#                   ...
#                 </div>            ))}
#               </div>
#             </div>
# Replace with correct structure
old3 = """                          </button>                      </div>
                    ))}
                  </div>
                  <Button variant="secondary" size="sm" className="mt-1 w-full" onClick={() => addSet(pe.id)}>
                    <Icon name="plus" size={14} />
                    Add set
                  </Button>
                </div>            ))}
              </div>
            </div>"""
new3 = """                          </button>
                         </div>
                       ))}
                    </div>
                    <Button variant="secondary" size="sm" className="mt-1 w-full" onClick={() => addSet(pe.id)}>
                      <Icon name="plus" size={14} />
                      Add set
                    </Button>
                  </div>
                ))}
              </div>
            </div>"""
count3 = content.count(old3)
print(f"Fix 3: found {count3} occurrences")
if count3 == 1:
    content = content.replace(old3, new3)
elif count3 == 2:
    print("Warning: Fix 3 matched 2 occurrences, replacing all")

with open('src/pages/WorkoutPage.tsx', 'w') as f:
    f.write(content)

print("Done")
